#!/usr/bin/env bash
# End-to-end check of every M7 server action over the real HTTP action route.
# Uses the progressive-enhancement (MPA) action encoding React expects:
# a multipart POST with a `$ACTION_ID_<id>` field.
set -uo pipefail

BASE="http://localhost:3457"
DB="data/mining.db"

pass=0
fail=0

action_id() {
  python3 - "$1" <<'PY'
import json, sys
name = sys.argv[1]
m = json.load(open('.next/server/server-reference-manifest.json'))
for aid, info in m['node'].items():
    if info.get('exportedName') == name:
        print(aid)
        break
PY
}

post() { # $1 = action name, $2 = path, rest = form fields
  local name="$1" path="$2"; shift 2
  local id; id="$(action_id "$name")"
  if [ -z "$id" ]; then echo "NO-ID $name"; return 1; fi
  local args=()
  for f in "$@"; do args+=(--form-string "$f"); done
  curl -s -o /tmp/opencode/e2e-last.html -w "%{http_code}" -X POST "$BASE$path" \
    --form-string "\$ACTION_ID_$id=1" "${args[@]}"
}

check() { # $1 = label, $2 = expected sqlite output, $3 = actual
  if [ "$2" = "$3" ]; then
    echo "PASS  $1"; pass=$((pass+1))
  else
    echo "FAIL  $1  (expected [$2] got [$3])"; fail=$((fail+1))
  fi
}

q() { sqlite3 "$DB" "$1"; }

# clean any residue from earlier runs
q "DELETE FROM sites WHERE code='E2E';" >/dev/null
q "DELETE FROM alert_rules WHERE name='E2E rule';" >/dev/null
q "DELETE FROM shipments WHERE customer='TestCo';" >/dev/null
q "DELETE FROM safety_incidents WHERE description='e2e test incident';" >/dev/null
q "DELETE FROM equipment WHERE code='E2E-UNIT';" >/dev/null

# resolve ids by code (autoincrement ids shift after a reseed)
SAL_ID=$(q "SELECT id FROM sites WHERE code='SAL';")
BAL_ID=$(q "SELECT id FROM sites WHERE code='BAL';")
MFC_ID=$(q "SELECT id FROM sites WHERE code='MFC';")
UNIT_ID=$(q "SELECT id FROM equipment WHERE code='SAL-DRL-01';")

echo "--- production (upsert) ---"
code=$(post createProduction /production "site=SAL" "date=2026-10-20" "ore_tonnes=1111" "waste_tonnes=2222" "concentrate_tonnes=333" "head_grade_pct=1.11" "recovery_pct=77.77" "throughput_tpd=1111")
check "createProduction http=$code" "1111|2222|333|1.11|77.77|1111" "$(q "SELECT printf('%g',ore_tonnes)||'|'||printf('%g',waste_tonnes)||'|'||printf('%g',concentrate_tonnes)||'|'||printf('%g',head_grade_pct)||'|'||printf('%g',recovery_pct)||'|'||printf('%g',throughput_tpd) FROM production_daily WHERE site_id=$SAL_ID AND date='2026-10-20';")"

echo "--- production (invalid recovery blocked) ---"
code=$(post createProduction /production "site=SAL" "date=2026-10-20" "ore_tonnes=9999" "waste_tonnes=1" "concentrate_tonnes=1" "head_grade_pct=1" "recovery_pct=150" "throughput_tpd=1")
check "createProduction rejects recovery>100" "1111" "$(q "SELECT printf('%g',ore_tonnes) FROM production_daily WHERE site_id=$SAL_ID AND date='2026-10-20';")"

echo "--- production (unknown site blocked) ---"
code=$(post createProduction /production "site=NOPE" "date=2026-10-20" "ore_tonnes=1" "waste_tonnes=1" "concentrate_tonnes=1" "head_grade_pct=1" "recovery_pct=1" "throughput_tpd=1")
check "createProduction rejects unknown site" "1111" "$(q "SELECT printf('%g',ore_tonnes) FROM production_daily WHERE site_id=$SAL_ID AND date='2026-10-20';")"

echo "--- equipment event (upsert) ---"
code=$(post createEquipmentEvent /equipment "equipment=SAL-EXC-01" "date=2026-10-20" "running_hours=20" "downtime_hours=4" "downtime_reason=hydraulic" "fuel_litres=500")
check "createEquipmentEvent http=$code" "20|4|hydraulic|500" "$(q "SELECT printf('%g',running_hours)||'|'||printf('%g',downtime_hours)||'|'||downtime_reason||'|'||printf('%g',fuel_litres) FROM equipment_events WHERE equipment_id=(SELECT id FROM equipment WHERE code='SAL-EXC-01') AND date='2026-10-20';")"

echo "--- equipment status ---"
code=$(post setEquipmentStatus /equipment "equipment_id=$UNIT_ID" "status=down")
check "setEquipmentStatus http=$code" "down" "$(q "SELECT status FROM equipment WHERE id=$UNIT_ID;")"
post setEquipmentStatus /equipment "equipment_id=$UNIT_ID" "status=operational" >/dev/null
check "setEquipmentStatus revert" "operational" "$(q "SELECT status FROM equipment WHERE id=$UNIT_ID;")"

echo "--- incident create + close ---"
code=$(post createIncident /safety "site=GBR" "date=2026-10-20" "type=near-miss" "severity=medium" "description=e2e test incident" "lost_time_days=0" "reported_by=Tester")
newid=$(q "SELECT id FROM safety_incidents WHERE description='e2e test incident' ORDER BY id DESC LIMIT 1;")
check "createIncident http=$code" "open" "$(q "SELECT status FROM safety_incidents WHERE id=$newid;")"
code=$(post closeIncident /safety "id=$newid")
check "closeIncident http=$code" "closed" "$(q "SELECT status FROM safety_incidents WHERE id=$newid;")"

echo "--- env reading (upsert) ---"
code=$(post createEnvReading /environment "site=BAL" "date=2026-10-20" "water_withdrawal_m3=111" "water_recycled_pct=42" "energy_mwh=222" "co2e_tonnes=33" "tailings_level_pct=55")
check "createEnvReading http=$code" "111|42|222|33|55" "$(q "SELECT printf('%g',water_withdrawal_m3)||'|'||printf('%g',water_recycled_pct)||'|'||printf('%g',energy_mwh)||'|'||printf('%g',co2e_tonnes)||'|'||printf('%g',tailings_level_pct) FROM env_readings WHERE site_id=$BAL_ID AND date='2026-10-20';")"

echo "--- stockpile (upsert) + shipment ---"
code=$(post createStockpile /inventory "site=BAL" "product=lithium" "grade_pct=1.5" "tonnes=9999")
check "createStockpile http=$code" "1.5|9999" "$(q "SELECT printf('%g',grade_pct)||'|'||printf('%g',tonnes) FROM stockpiles WHERE site_id=$BAL_ID AND product='lithium';")"
code=$(post createShipment /inventory "site=BAL" "product=lithium" "tonnes=500" "destination=Testport" "customer=TestCo" "status=in-transit" "eta=2026-11-01" "price_usd_per_t=1000")
check "createShipment http=$code" "500|Testport|in-transit" "$(q "SELECT printf('%g',tonnes)||'|'||destination||'|'||status FROM shipments WHERE customer='TestCo' ORDER BY id DESC LIMIT 1;")"

echo "--- alert rules ---"
code=$(post createRule /settings "name=E2E rule" "metric=recovery_pct" "comparator=<" "threshold=42" "severity=high" "site=MFC")
ruleid=$(q "SELECT id FROM alert_rules WHERE name='E2E rule' ORDER BY id DESC LIMIT 1;")
check "createRule http=$code" "recovery_pct|<|42|high|$MFC_ID|1" "$(q "SELECT metric||'|'||comparator||'|'||printf('%g',threshold)||'|'||severity||'|'||site_id||'|'||active FROM alert_rules WHERE id=$ruleid;")"
code=$(post toggleRule /settings "id=$ruleid")
check "toggleRule http=$code" "0" "$(q "SELECT active FROM alert_rules WHERE id=$ruleid;")"
code=$(post deleteRule /settings "id=$ruleid")
check "deleteRule http=$code" "0" "$(q "SELECT COUNT(*) FROM alert_rules WHERE id=$ruleid;")"

echo "--- fleet unit create ---"
code=$(post createEquipment /equipment "site=MFC" "code=E2E-UNIT" "name=E2E Unit" "type=loader" "status=standby" "manufacturer=TestCo" "model=T1" "capacity=10" "installed_date=2026-01-01")
check "createEquipment http=$code" "E2E-UNIT|standby|$MFC_ID" "$(q "SELECT code||'|'||status||'|'||site_id FROM equipment WHERE code='E2E-UNIT';")"

echo "--- site create + update ---"
code=$(post createSite /sites "code=E2E" "name=E2E Test Site" "mineral=lithium" "region=Testville" "mine_type=open-pit" "status=active" "capacity_tpd=1000")
siteid=$(q "SELECT id FROM sites WHERE code='E2E';")
check "createSite http=$code" "E2E|active|1000" "$(q "SELECT code||'|'||status||'|'||printf('%g',capacity_tpd) FROM sites WHERE id=$siteid;")"
code=$(post updateSite /sites "id=$siteid" "code=E2E" "name=E2E Test Site" "mineral=lithium" "region=Testville" "mine_type=open-pit" "status=care-maintenance" "capacity_tpd=2000")
check "updateSite http=$code" "care-maintenance|2000" "$(q "SELECT status||'|'||printf('%g',capacity_tpd) FROM sites WHERE id=$siteid;")"
code=$(post createSite /sites "code=E2E" "name=Duplicate Code" "mineral=lithium" "region=Testville" "mine_type=open-pit" "status=active" "capacity_tpd=1000")
check "createSite rejects duplicate code" "1" "$(q "SELECT COUNT(*) FROM sites WHERE code='E2E';")"

echo
echo "passed=$pass failed=$fail"
[ "$fail" -eq 0 ]
