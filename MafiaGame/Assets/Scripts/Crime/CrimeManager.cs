using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Mafia.Core;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Crime
{
    public class CrimeManager : MonoBehaviour
    {
        public static CrimeManager Instance { get; private set; }

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void GetCrimes(Action<List<Mafia.Data.Crime>> onSuccess)
        {
            StartCoroutine(ApiClient.Instance.Get<CrimeListResponse>("/api/crimes",
                r => onSuccess?.Invoke(r.crimes)
            ));
        }

        public void CommitCrime(int crimeId, Action<CrimeResult> onSuccess, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<CrimeResult>($"/api/crimes/{crimeId}/commit",
                null,
                result =>
                {
                    var player = GameManager.Instance.CurrentPlayer;
                    player.nerve -= GetNerveCostLocal(crimeId);
                    if (result.success)
                    {
                        player.money += result.moneyGained;
                        player.exp += result.expGained;
                        player.crystals += result.crystalsGained;
                    }
                    EventBus.Publish(GameEvent.CrimeCompleted, result);
                    onSuccess?.Invoke(result);
                },
                onError
            ));
        }

        public void AttackPlayer(int targetId, Action<CombatResult> onSuccess, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<CombatResult>($"/api/combat/attack/{targetId}",
                null,
                result =>
                {
                    if (result.victory)
                        GameManager.Instance.AddMoney(result.moneyStolen);
                    GameManager.Instance.CurrentPlayer.exp += result.expGained;
                    EventBus.Publish(GameEvent.CombatCompleted, result);
                    onSuccess?.Invoke(result);
                },
                onError
            ));
        }

        public void SearchPlayer(string query, Action<List<SearchResult>> onSuccess)
        {
            StartCoroutine(ApiClient.Instance.Get<SearchResponse>($"/api/search?q={UnityEngine.Networking.UnityWebRequest.EscapeURL(query)}",
                r => onSuccess?.Invoke(r.players)
            ));
        }

        private int GetNerveCostLocal(int crimeId) => 1;

        [Serializable] class CrimeListResponse { public List<Mafia.Data.Crime> crimes; }

        [Serializable]
        public class SearchResult
        {
            public int id;
            public string username;
            public string avatarUrl;
            public int level;
            public bool isVip;
            public bool isOnline;
        }

        [Serializable] class SearchResponse { public List<SearchResult> players; }
    }
}
