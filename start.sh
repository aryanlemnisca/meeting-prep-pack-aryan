#!/bin/bash
# start.sh — Launches both Next.js and scheduler
echo "Starting Meeting Prep Pack..."

# Start Next.js in background
npm run start &
NEXTJS_PID=$!

# Start scheduler in background
npm run scheduler &
SCHEDULER_PID=$!

echo "Next.js PID: $NEXTJS_PID"
echo "Scheduler PID: $SCHEDULER_PID"

# Wait for either to exit
wait -n $NEXTJS_PID $SCHEDULER_PID
EXIT_CODE=$?

# If one exits, kill the other
kill $NEXTJS_PID 2>/dev/null
kill $SCHEDULER_PID 2>/dev/null

exit $EXIT_CODE
