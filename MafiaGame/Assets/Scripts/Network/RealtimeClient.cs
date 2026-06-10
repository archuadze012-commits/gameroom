using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Mafia.Network
{
    // Connects to Laravel Reverb (Pusher-compatible WebSocket)
    public class RealtimeClient : MonoBehaviour
    {
        public static RealtimeClient Instance { get; private set; }

        [Header("Reverb Config")]
        [SerializeField] private string appKey = "your-reverb-app-key";
        [SerializeField] private string host = "ws.your-mafia-game.com";
        [SerializeField] private int port = 443;
        [SerializeField] private bool useTls = true;

        private WebSocket _ws;
        private readonly Dictionary<string, List<Action<JObject>>> _channelHandlers = new();
        private bool _isConnected;
        private float _pingTimer;
        private const float PingInterval = 30f;

        public event Action OnConnected;
        public event Action OnDisconnected;
        public event Action<string> OnError;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public async void Connect()
        {
            var scheme = useTls ? "wss" : "ws";
            var url = $"{scheme}://{host}:{port}/app/{appKey}?protocol=7&client=unity&version=1.0";

            _ws = new WebSocket(url);
            _ws.OnOpen += OnOpen;
            _ws.OnMessage += OnMessage;
            _ws.OnError += msg => OnError?.Invoke(msg);
            _ws.OnClose += _ => { _isConnected = false; OnDisconnected?.Invoke(); };

            await _ws.Connect();
        }

        public async void Disconnect()
        {
            if (_ws != null)
                await _ws.Close();
        }

        void Update()
        {
#if !UNITY_WEBGL || UNITY_EDITOR
            _ws?.DispatchMessageQueue();
#endif
            if (_isConnected)
            {
                _pingTimer += Time.deltaTime;
                if (_pingTimer >= PingInterval)
                {
                    _pingTimer = 0f;
                    SendRaw(new { @event = "pusher:ping", data = new { } });
                }
            }
        }

        private void OnOpen()
        {
            _isConnected = true;
            OnConnected?.Invoke();
        }

        private void OnMessage(byte[] data)
        {
            var text = Encoding.UTF8.GetString(data);
            try
            {
                var msg = JObject.Parse(text);
                var evt = msg["event"]?.ToString();
                var channel = msg["channel"]?.ToString();

                if (evt == "pusher:connection_established") return;
                if (evt == "pusher:pong") return;

                if (channel != null && _channelHandlers.TryGetValue(channel, out var handlers))
                {
                    var eventData = msg["data"] is JObject d ? d : JObject.Parse(msg["data"]?.ToString() ?? "{}");
                    foreach (var h in handlers)
                        h.Invoke(eventData);
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning("Realtime parse error: " + e.Message);
            }
        }

        public void Subscribe(string channel, Action<JObject> handler)
        {
            if (!_channelHandlers.ContainsKey(channel))
                _channelHandlers[channel] = new List<Action<JObject>>();
            _channelHandlers[channel].Add(handler);

            SendRaw(new
            {
                @event = "pusher:subscribe",
                data = new { channel }
            });
        }

        public void Unsubscribe(string channel)
        {
            _channelHandlers.Remove(channel);
            SendRaw(new
            {
                @event = "pusher:unsubscribe",
                data = new { channel }
            });
        }

        private async void SendRaw(object payload)
        {
            if (_ws?.State != WebSocketState.Open) return;
            var json = JsonConvert.SerializeObject(payload);
            await _ws.SendText(json);
        }

        void OnDestroy() => Disconnect();
    }
}
