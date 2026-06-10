using System;
using System.Collections.Generic;
using UnityEngine;

namespace Mafia.Data
{
    [Serializable]
    public class PlayerData
    {
        public int id;
        public string username;
        public string avatarUrl;
        public int level;
        public int exp;
        public int expPercent;

        // Resources
        public long money;
        public long dirtyMoney;
        public int crystals;

        // Stats
        public int strength;
        public int defense;
        public int speed;

        // Consumables
        public int hp;
        public int hpMax;
        public int energy;
        public int energyMax;
        public int awake;
        public int awakeMax;
        public int nerve;
        public int nerveMax;

        // Status
        public bool isVip;
        public int vipLevel;
        public int gangId;
        public string gangName;
        public string professionAvatar;

        // Computed
        public float HpPercent => hpMax > 0 ? (float)hp / hpMax : 0f;
        public float EnergyPercent => energyMax > 0 ? (float)energy / energyMax : 0f;
        public float AwakePercent => awakeMax > 0 ? (float)awake / awakeMax : 0f;
        public float NervePercent => nerveMax > 0 ? (float)nerve / nerveMax : 0f;
        public float ExpPercent => expPercent / 100f;
    }

    [Serializable]
    public class PlayerStats
    {
        public int baseStrength;
        public int baseDefense;
        public int baseSpeed;
        public int weaponBonus;
        public int clothingBonus;
        public int vehicleBonus;

        public int TotalStrength => baseStrength + weaponBonus;
        public int TotalDefense => baseDefense + clothingBonus;
        public int TotalSpeed => baseSpeed + vehicleBonus;
    }

    [Serializable]
    public class InventoryItem
    {
        public int id;
        public string name;
        public string type; // weapon, clothing, vehicle, consumable
        public string imageUrl;
        public int strengthBonus;
        public int defenseBonus;
        public int speedBonus;
        public bool equipped;
        public int quantity;
    }

    [Serializable]
    public class LeaderboardEntry
    {
        public int rank;
        public int playerId;
        public string username;
        public string avatarUrl;
        public int level;
        public long netWorth;
        public bool isVip;
    }
}
