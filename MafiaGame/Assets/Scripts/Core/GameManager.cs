using UnityEngine;
using UnityEngine.SceneManagement;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public PlayerData CurrentPlayer { get; private set; }
        public bool IsLoggedIn => CurrentPlayer != null;

        [SerializeField] private string loginScene = "Login";
        [SerializeField] private string mainScene = "Main";

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        void Start()
        {
            var savedToken = PlayerPrefs.GetString("auth_token", "");
            if (!string.IsNullOrEmpty(savedToken))
            {
                ApiClient.Instance.SetAuth(savedToken, "");
                LoadPlayerData();
            }
            else
            {
                SceneManager.LoadScene(loginScene);
            }
        }

        public void OnLoginSuccess(string token, PlayerData player)
        {
            PlayerPrefs.SetString("auth_token", token);
            PlayerPrefs.Save();
            ApiClient.Instance.SetAuth(token, "");
            CurrentPlayer = player;
            ConnectRealtime();
            SceneManager.LoadScene(mainScene);
        }

        public void OnLogout()
        {
            PlayerPrefs.DeleteKey("auth_token");
            CurrentPlayer = null;
            ApiClient.Instance.ClearAuth();
            RealtimeClient.Instance.Disconnect();
            SceneManager.LoadScene(loginScene);
        }

        public void UpdatePlayerData(PlayerData updated)
        {
            CurrentPlayer = updated;
            EventBus.Publish(GameEvent.PlayerDataUpdated, updated);
        }

        public void AddMoney(long amount)
        {
            CurrentPlayer.money += amount;
            EventBus.Publish(GameEvent.ResourceChanged, "money");
        }

        public void AddDirtyMoney(long amount)
        {
            CurrentPlayer.dirtyMoney += amount;
            EventBus.Publish(GameEvent.ResourceChanged, "dirty_money");
        }

        public void AddCrystals(int amount)
        {
            CurrentPlayer.crystals += amount;
            EventBus.Publish(GameEvent.ResourceChanged, "crystals");
        }

        private void LoadPlayerData()
        {
            StartCoroutine(ApiClient.Instance.Get<PlayerData>("/api/player/me",
                player =>
                {
                    CurrentPlayer = player;
                    ConnectRealtime();
                    SceneManager.LoadScene(mainScene);
                },
                err =>
                {
                    Debug.LogWarning("Auth failed: " + err);
                    PlayerPrefs.DeleteKey("auth_token");
                    SceneManager.LoadScene(loginScene);
                }
            ));
        }

        private void ConnectRealtime()
        {
            RealtimeClient.Instance.Connect();
            RealtimeClient.Instance.OnConnected += () =>
            {
                var userId = CurrentPlayer.id;
                RealtimeClient.Instance.Subscribe($"private-user.{userId}", msg =>
                {
                    var evt = msg["event"]?.ToString();
                    if (evt == "player.updated")
                        LoadPlayerData();
                });
                RealtimeClient.Instance.Subscribe("chat", msg =>
                    EventBus.Publish(GameEvent.ChatMessageReceived, msg));
            };
        }
    }
}
