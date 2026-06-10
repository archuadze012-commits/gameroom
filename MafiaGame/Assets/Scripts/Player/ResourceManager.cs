using System.Collections;
using UnityEngine;
using Mafia.Core;
using Mafia.Network;

namespace Mafia.Player
{
    public class ResourceManager : MonoBehaviour
    {
        public static ResourceManager Instance { get; private set; }

        [SerializeField] private float autoRefreshInterval = 60f;
        private float _timer;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Update()
        {
            _timer += Time.deltaTime;
            if (_timer >= autoRefreshInterval)
            {
                _timer = 0f;
                RefreshResources();
            }
        }

        public void RefillStat(string stat, int crystalCost = 0)
        {
            StartCoroutine(ApiClient.Instance.Post<RefillResponse>($"/api/player/refill/{stat}",
                new { crystals = crystalCost },
                response =>
                {
                    var player = GameManager.Instance.CurrentPlayer;
                    switch (stat)
                    {
                        case "hp":     player.hp = response.newValue; player.hpMax = response.maxValue; break;
                        case "energy": player.energy = response.newValue; player.energyMax = response.maxValue; break;
                        case "awake":  player.awake = response.newValue; player.awakeMax = response.maxValue; break;
                        case "nerve":  player.nerve = response.newValue; player.nerveMax = response.maxValue; break;
                    }
                    if (crystalCost > 0)
                        player.crystals -= crystalCost;
                    EventBus.Publish(GameEvent.ResourceChanged, stat);
                }
            ));
        }

        public void RefreshResources()
        {
            StartCoroutine(ApiClient.Instance.Get<ResourceSnapshot>("/api/player/resources",
                snapshot =>
                {
                    var p = GameManager.Instance.CurrentPlayer;
                    if (p == null) return;
                    p.money = snapshot.money;
                    p.dirtyMoney = snapshot.dirtyMoney;
                    p.crystals = snapshot.crystals;
                    p.hp = snapshot.hp; p.hpMax = snapshot.hpMax;
                    p.energy = snapshot.energy; p.energyMax = snapshot.energyMax;
                    p.awake = snapshot.awake; p.awakeMax = snapshot.awakeMax;
                    p.nerve = snapshot.nerve; p.nerveMax = snapshot.nerveMax;
                    EventBus.Publish(GameEvent.ResourceChanged, "all");
                }
            ));
        }

        [System.Serializable]
        private class RefillResponse
        {
            public int newValue;
            public int maxValue;
        }

        [System.Serializable]
        private class ResourceSnapshot
        {
            public long money;
            public long dirtyMoney;
            public int crystals;
            public int hp; public int hpMax;
            public int energy; public int energyMax;
            public int awake; public int awakeMax;
            public int nerve; public int nerveMax;
        }
    }
}
