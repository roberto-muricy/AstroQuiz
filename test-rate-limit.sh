#!/bin/bash
# Test rate limiting - sends 110 requests

for i in {1..110}
do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:1337/api/quiz/rules)
  echo "Request $i: $code"
done
