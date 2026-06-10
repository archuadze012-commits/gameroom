using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Mafia.Core;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Buildings
{
    public class BuildingManager : MonoBehaviour
    {
        public static BuildingManager Instance { get; private set; }

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void CreateBuilding(int slotId, int buildingTypeId, Action<BuildingData> onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<BuildingResponse>($"/api/map/{slotId}/building/create",
                new { building_type_id = buildingTypeId },
                response =>
                {
                    EventBus.Publish(GameEvent.BuildingStateChanged, slotId);
                    onSuccess?.Invoke(response.building);
                },
                onError
            ));
        }

        public void UpgradeBuilding(int slotId, Action<BuildingData> onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<BuildingResponse>($"/api/map/{slotId}/building/upgrade",
                null,
                response =>
                {
                    EventBus.Publish(GameEvent.BuildingStateChanged, slotId);
                    onSuccess?.Invoke(response.building);
                },
                onError
            ));
        }

        public void CollectProduction(int slotId, Action<CollectResult> onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<CollectResult>($"/api/map/{slotId}/building/collect",
                null,
                result =>
                {
                    GameManager.Instance.AddMoney(result.moneyCollected);
                    GameManager.Instance.AddDirtyMoney(result.dirtyMoneyCollected);
                    EventBus.Publish(GameEvent.BuildingStateChanged, slotId);
                    onSuccess?.Invoke(result);
                },
                onError
            ));
        }

        public void GetBuildingTypes(int slotId, Action<List<BuildingTypeOption>> onSuccess)
        {
            StartCoroutine(ApiClient.Instance.Get<BuildingTypesResponse>($"/api/map/{slotId}/building/types",
                r => onSuccess?.Invoke(r.types)
            ));
        }

        public void PlantFarm(int slotId, Action onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<object>($"/api/map/farm/plant/{slotId}",
                null,
                _ => { EventBus.Publish(GameEvent.FarmStateChanged, slotId); onSuccess?.Invoke(); },
                onError
            ));
        }

        public void HarvestFarm(int slotId, Action<HarvestResult> onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<HarvestResult>($"/api/map/farm/harvest/{slotId}",
                null,
                result =>
                {
                    EventBus.Publish(GameEvent.FarmStateChanged, slotId);
                    onSuccess?.Invoke(result);
                },
                onError
            ));
        }

        public void BuildMine(int slotId, Action onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<object>($"/api/map/mine/build/{slotId}",
                null,
                _ => { EventBus.Publish(GameEvent.BuildingStateChanged, slotId); onSuccess?.Invoke(); },
                onError
            ));
        }

        [Serializable] class BuildingResponse { public BuildingData building; }
        [Serializable] class BuildingTypesResponse { public List<BuildingTypeOption> types; }

        [Serializable]
        public class CollectResult
        {
            public long moneyCollected;
            public long dirtyMoneyCollected;
        }

        [Serializable]
        public class HarvestResult
        {
            public int vegetablesGained;
            public long moneyGained;
        }

        [Serializable]
        public class BuildingTypeOption
        {
            public int id;
            public string name;
            public string description;
            public string imageUrl;
            public long cost;
            public int buildTimeSeconds;
        }
    }
}
