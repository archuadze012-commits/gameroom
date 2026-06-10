using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Mafia.Core;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Gang
{
    public class GangManager : MonoBehaviour
    {
        public static GangManager Instance { get; private set; }

        public GangData CurrentGang { get; private set; }

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            if (GameManager.Instance.CurrentPlayer?.gangId > 0)
                LoadGang();
        }

        public void LoadGang()
        {
            StartCoroutine(ApiClient.Instance.Get<GangData>("/api/gang/main",
                gang =>
                {
                    CurrentGang = gang;
                    SubscribeToGangChannel();
                }
            ));
        }

        public void SendGangMessage(string text, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<object>("/api/gang/message",
                new { message = text },
                _ => { },
                onError
            ));
        }

        public void CreateGang(string name, string tag, Action onSuccess, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<GangData>("/api/gang/create",
                new { name, tag },
                gang =>
                {
                    CurrentGang = gang;
                    GameManager.Instance.CurrentPlayer.gangId = gang.id;
                    GameManager.Instance.CurrentPlayer.gangName = gang.name;
                    onSuccess?.Invoke();
                },
                onError
            ));
        }

        public void InviteMember(int playerId, Action onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<object>($"/api/gang/invite/{playerId}",
                null, _ => onSuccess?.Invoke(), onError
            ));
        }

        public void KickMember(int playerId, Action onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<object>($"/api/gang/kick/{playerId}",
                null, _ => onSuccess?.Invoke(), onError
            ));
        }

        public void LeaveGang(Action onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<object>("/api/gang/leave",
                null,
                _ =>
                {
                    CurrentGang = null;
                    GameManager.Instance.CurrentPlayer.gangId = 0;
                    onSuccess?.Invoke();
                },
                onError
            ));
        }

        public void GetLeaderboard(Action<List<GangData>> onSuccess)
        {
            StartCoroutine(ApiClient.Instance.Get<GangLeaderboardResponse>("/api/gang/leaderboard",
                r => onSuccess?.Invoke(r.gangs)
            ));
        }

        private void SubscribeToGangChannel()
        {
            if (CurrentGang == null) return;
            RealtimeClient.Instance.Subscribe($"private-gang.{CurrentGang.id}", msg =>
            {
                EventBus.Publish(GameEvent.GangMessageReceived, msg);
            });
        }

        [Serializable] class GangLeaderboardResponse { public List<GangData> gangs; }
    }
}
