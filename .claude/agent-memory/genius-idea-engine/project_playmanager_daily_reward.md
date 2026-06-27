---
name: playmanager-daily-reward
description: PlayManager activity/daily reward streak (engagement loop)
metadata: 
  node_type: memory
  type: project
  originSessionId: cb1e46db-d1fd-41d1-8547-93299633b5f9
---

PlayManager daily/activity reward (migration `playmanager_activity_reward`, APPLIED 2026-06-27). Media building's `daily_reward` module flipped `planned`→`ready`.

**DB:** table `pm_engagement(team_id pk, streak smallint, last_claim_day integer default -1, updated_at)` + RLS owner-select. RPC `pm_claim_daily_reward(team)`: keyed on `pm_calendar.total_days` (an in-game day, which advances per day-advancing action). If last_claim_day = today → raise `already_claimed`. Streak = (last_claim_day = today−1 ? min(7, streak+1) : 1). Reward = 15000 + streak*7000 (22k…64k). Credits wallet, updates engagement. Returns {streak, reward, day}.

**TS:** action `claimPlayManagerDailyReward` (already_claimed → 'unavailable'). city-data loads `pm_engagement` (EngagementRow) + computes `snapshot.dailyReward = {canClaim, streak, nextStreak, nextReward, nextRewardLabel}` (canClaim = last_claim_day !== total_days). UI: media daily_reward module render branch (playmanager-city-editor.tsx) — streak number + 7 dots + claim button (disabled when !canClaim).

Note: "daily" = in-game day (total_days), not wall-clock — advancing time via any action unlocks the next claim, so it's really an activity-reward loop.

Related: [[playmanager-office-scouting]], [[playmanager-match-v2-vision]].
