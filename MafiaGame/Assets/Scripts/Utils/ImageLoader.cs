using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;

namespace Mafia.Network
{
    public static class ImageLoader
    {
        private static readonly Dictionary<string, Sprite> _cache = new();

        public static IEnumerator Load(string url, Image target)
        {
            if (string.IsNullOrEmpty(url)) yield break;

            if (_cache.TryGetValue(url, out var cached))
            {
                target.sprite = cached;
                yield break;
            }

            using var req = UnityWebRequestTexture.GetTexture(url);
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                var tex = DownloadHandlerTexture.GetContent(req);
                var sprite = Sprite.Create(tex,
                    new Rect(0, 0, tex.width, tex.height),
                    new Vector2(0.5f, 0.5f));
                _cache[url] = sprite;
                if (target != null)
                    target.sprite = sprite;
            }
        }

        public static void ClearCache() => _cache.Clear();
    }
}
