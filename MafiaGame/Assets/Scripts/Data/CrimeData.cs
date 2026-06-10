using System;
using System.Collections.Generic;

namespace Mafia.Data
{
    [Serializable]
    public class Crime
    {
        public int id;
        public string name;
        public string description;
        public string imageUrl;
        public int nerveCost;
        public int minLevel;
        public int successChance;
        public CrimeReward reward;
        public long cooldownSeconds;
        public long nextAvailableAt;
        public bool isAvailable;
    }

    [Serializable]
    public class CrimeReward
    {
        public long moneyMin;
        public long moneyMax;
        public int expMin;
        public int expMax;
        public int crystalsMin;
        public int crystalsMax;
    }

    [Serializable]
    public class CrimeResult
    {
        public bool success;
        public string message;
        public long moneyGained;
        public int expGained;
        public int crystalsGained;
        public string animationType;
    }

    [Serializable]
    public class CombatResult
    {
        public bool victory;
        public int attackerId;
        public int defenderId;
        public string attackerName;
        public string defenderName;
        public int attackerDamage;
        public int defenderDamage;
        public long moneyStolen;
        public int expGained;
        public string narrativeText;
        public List<CombatRound> rounds;
    }

    [Serializable]
    public class CombatRound
    {
        public int roundNumber;
        public int attackerHpAfter;
        public int defenderHpAfter;
        public int damageDealt;
        public string description;
    }

    [Serializable]
    public class Achievement
    {
        public int id;
        public string title;
        public string description;
        public string imageUrl;
        public bool isUnlocked;
        public bool rewardClaimed;
        public AchievementReward reward;
        public float progress;
        public float progressMax;
    }

    [Serializable]
    public class AchievementReward
    {
        public long money;
        public int crystals;
        public int exp;
    }
}
