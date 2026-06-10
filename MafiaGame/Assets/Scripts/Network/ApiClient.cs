using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

namespace Mafia.Network
{
    public class ApiClient : MonoBehaviour
    {
        public static ApiClient Instance { get; private set; }

        [SerializeField] private string baseUrl = "https://your-mafia-api.com";

        private string _authToken;
        private string _csrfToken;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void SetAuth(string token, string csrf)
        {
            _authToken = token;
            _csrfToken = csrf;
        }

        public void ClearAuth()
        {
            _authToken = null;
            _csrfToken = null;
        }

        public bool IsAuthenticated => !string.IsNullOrEmpty(_authToken);

        public IEnumerator Get<T>(string endpoint, Action<T> onSuccess, Action<string> onError = null)
        {
            using var req = UnityWebRequest.Get(baseUrl + endpoint);
            AddHeaders(req);
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                try
                {
                    var result = JsonConvert.DeserializeObject<T>(req.downloadHandler.text);
                    onSuccess?.Invoke(result);
                }
                catch (Exception e)
                {
                    onError?.Invoke("Parse error: " + e.Message);
                }
            }
            else
            {
                onError?.Invoke(ParseError(req));
            }
        }

        public IEnumerator Post<T>(string endpoint, object body, Action<T> onSuccess, Action<string> onError = null)
        {
            var json = JsonConvert.SerializeObject(body);
            using var req = new UnityWebRequest(baseUrl + endpoint, "POST");
            req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            AddHeaders(req);
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                try
                {
                    var result = JsonConvert.DeserializeObject<T>(req.downloadHandler.text);
                    onSuccess?.Invoke(result);
                }
                catch (Exception e)
                {
                    onError?.Invoke("Parse error: " + e.Message);
                }
            }
            else
            {
                onError?.Invoke(ParseError(req));
            }
        }

        public IEnumerator PostRaw(string endpoint, object body, Action onSuccess, Action<string> onError = null)
        {
            yield return Post<object>(endpoint, body, _ => onSuccess?.Invoke(), onError);
        }

        private void AddHeaders(UnityWebRequest req)
        {
            req.SetRequestHeader("Accept", "application/json");
            req.SetRequestHeader("X-Requested-With", "UnityClient");
            if (!string.IsNullOrEmpty(_authToken))
                req.SetRequestHeader("Authorization", "Bearer " + _authToken);
            if (!string.IsNullOrEmpty(_csrfToken))
                req.SetRequestHeader("X-CSRF-TOKEN", _csrfToken);
        }

        private string ParseError(UnityWebRequest req)
        {
            try
            {
                var err = JsonConvert.DeserializeObject<ApiError>(req.downloadHandler.text);
                return err?.message ?? req.error;
            }
            catch
            {
                return req.error;
            }
        }

        [Serializable]
        private class ApiError { public string message; }
    }
}
