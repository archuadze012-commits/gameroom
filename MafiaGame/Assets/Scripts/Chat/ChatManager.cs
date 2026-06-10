using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Mafia.Core;
using Mafia.Data;
using Mafia.Network;
using Newtonsoft.Json.Linq;

namespace Mafia.Chat
{
    public class ChatManager : MonoBehaviour
    {
        public static ChatManager Instance { get; private set; }

        public List<ChatMessage> Messages { get; } = new();
        public event Action<ChatMessage> OnMessageReceived;

        private const int MaxMessages = 100;
        private int _replyToId = -1;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            LoadHistory();
            EventBus.Subscribe(GameEvent.ChatMessageReceived, OnRealtimeMessage);
        }

        private void LoadHistory()
        {
            StartCoroutine(ApiClient.Instance.Get<ChatHistoryResponse>("/api/chat/history",
                r =>
                {
                    Messages.Clear();
                    Messages.AddRange(r.messages);
                    foreach (var m in Messages)
                        OnMessageReceived?.Invoke(m);
                }
            ));
        }

        public void SendMessage(string text, Action<string> onError = null)
        {
            if (string.IsNullOrWhiteSpace(text)) return;

            var payload = new { message = text, reply_to = _replyToId > 0 ? _replyToId : (int?)null };
            StartCoroutine(ApiClient.Instance.Post<object>("/api/chat/send", payload,
                _ => ClearReply(),
                onError
            ));
        }

        public void SetReply(int messageId) => _replyToId = messageId;
        public void ClearReply() => _replyToId = -1;

        public void ReportMessage(int messageId)
        {
            StartCoroutine(ApiClient.Instance.Post<object>($"/api/chat/report/{messageId}", null, _ => { }));
        }

        private void OnRealtimeMessage(object data)
        {
            if (data is not JObject jObj) return;
            try
            {
                var msg = jObj.ToObject<ChatMessage>();
                if (msg == null) return;

                Messages.Add(msg);
                if (Messages.Count > MaxMessages)
                    Messages.RemoveAt(0);

                OnMessageReceived?.Invoke(msg);
            }
            catch (Exception e)
            {
                Debug.LogWarning("Chat parse: " + e.Message);
            }
        }

        [Serializable] class ChatHistoryResponse { public List<ChatMessage> messages; }
    }
}
