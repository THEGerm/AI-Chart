#!/usr/bin/env bash
# Chain sweep sessions: session -> sanity -> commit -> push, until done.
# GERM-DEV-0031.  Usage: bash chain.sh [max_sessions] [budget_min]
# Stops at the first failed sanity check or push, so a bad result never spreads.
set -u
cd "$(dirname "$0")"
MAX=${1:-5}
BUDGET=${2:-20}
ATTR=$'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01K9tQDQB4jmVi7uCdwJmwCP'

# Wait for a session already running (started by hand) to finish.
while pgrep -f "run.py session" > /dev/null; do sleep 20; done

push() {
  for i in 1 2 3 4; do
    git -c push.negotiate=true push -q && return 0
    sleep $((2 ** i))
  done
  return 1
}

commit_results() {
  local msg="$1"
  git add results/ && git commit -q -m "$msg"$'\n\n'"$ATTR" || true
  push || { echo "CHAIN STOP: push failed"; exit 2; }
}

# Close out any session file left uncommitted, after checking it.
if [ -n "$(git status --porcelain results/)" ]; then
  python3 sanity.py --quick || { echo "CHAIN STOP: sanity failed on existing results"; exit 1; }
  commit_results "Senet sweep: $(ls results/session-*.csv | tail -1 | xargs basename .csv) complete, sanity pass"
fi

for n in $(seq 1 "$MAX"); do
  out=$(python3 run.py session --budget-min "$BUDGET" 2>&1); echo "$out"
  if echo "$out" | grep -q "Sweep complete"; then echo "CHAIN DONE"; exit 0; fi
  sess=$(ls results/session-*.csv | tail -1 | xargs basename .csv)
  python3 sanity.py --quick || { commit_results "Senet sweep: $sess, SANITY FAILED, chain stopped"; echo "CHAIN STOP: sanity failed"; exit 1; }
  commit_results "Senet sweep: $sess complete, sanity pass"
  python3 run.py status
done
echo "CHAIN PAUSE: $MAX sessions run"
