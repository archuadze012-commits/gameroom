using System;
using System.Collections;
using UnityEngine;
using Mafia.Core;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Player
{
    public class AuthManager : MonoBehaviour
    {
        public static AuthManager Instance { get; private set; }

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Login(string email, string password, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<LoginResponse>("/api/auth/login",
                new { email, password },
                response =>
                {
                    GameManager.Instance.OnLoginSuccess(response.token, response.player);
                },
                err => onError?.Invoke(err)
            ));
        }

        public void Register(string username, string email, string password, string passwordConfirm, Action<string> onError = null)
        {
            StartCoroutine(ApiClient.Instance.Post<LoginResponse>("/api/auth/register",
                new { username, email, password, password_confirmation = passwordConfirm },
                response =>
                {
                    GameManager.Instance.OnLoginSuccess(response.token, response.player);
                },
                err => onError?.Invoke(err)
            ));
        }

        public void Logout()
        {
            StartCoroutine(ApiClient.Instance.PostRaw("/api/auth/logout", null,
                () => GameManager.Instance.OnLogout()
            ));
        }

        [Serializable]
        private class LoginResponse
        {
            public string token;
            public PlayerData player;
        }
    }
}
