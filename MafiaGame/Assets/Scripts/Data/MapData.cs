using System;
using System.Collections.Generic;
using UnityEngine;

namespace Mafia.Data
{
    public enum SlotType { Normal, Mine, Farm, Airport, Ship, Plane }
    public enum SlotSize { Large, Small, ExtraSmall }
    public enum BuildingState { Empty, UnderConstruction, Built }

    [Serializable]
    public class MapSlot
    {
        public int slotId;
        public SlotType type;
        public SlotSize size;
        public Vector2 position;
        public BuildingData building;
        public bool isOwned;
        public int ownerId;
    }

    [Serializable]
    public class BuildingData
    {
        public int id;
        public string name;
        public string imageUrl;
        public BuildingState state;
        public int level;
        public int constructionTimeRemaining;
        public BuildingProduction production;
        public List<BuildingUpgrade> upgrades;
    }

    [Serializable]
    public class BuildingProduction
    {
        public long moneyPerHour;
        public long dirtyMoneyPerHour;
        public int crystalsPerHour;
    }

    [Serializable]
    public class BuildingUpgrade
    {
        public int level;
        public long cost;
        public int timeSeconds;
        public string description;
    }

    [Serializable]
    public class FarmSlot
    {
        public int slotId;
        public int state;
        public string growingSrc;
        public string harvestSrc;
        public string emptySrc;
        public long harvestTime;
    }

    [Serializable]
    public class ShipData
    {
        public int shipId;
        public int slotId;
        public bool isDisabled;
        public string destination;
        public long arrivalTime;
        public List<ShipCargo> cargo;
    }

    [Serializable]
    public class ShipCargo
    {
        public string type;
        public int quantity;
        public long value;
    }

    [Serializable]
    public class PlaneData
    {
        public int planeId;
        public int slotId;
        public bool isDisabled;
        public string destination;
        public long arrivalTime;
    }
}
