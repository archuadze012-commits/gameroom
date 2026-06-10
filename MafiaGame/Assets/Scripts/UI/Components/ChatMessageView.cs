using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.UI.Components
{
    public class ChatMessageView : MonoBehaviour
    {
        [SerializeField] private Image avatarImage;
        [SerializeField] private TMP_Text usernameText;
        [SerializeField] private TMP_Text messageText;
        [SerializeField] private TMP_Text timeText;
        [SerializeField] private GameObject vipBadge;
        [SerializeField] private GameObject replyBadge;
        [SerializeField] private TMP_Text replyText;
        [SerializeField] private Button replyButton;
        [SerializeField] private GameObject systemMessageStyle;

        private Action<ChatMessage> _onReply;

        public void Init(ChatMessage msg, Action<ChatMessage> onReply)
        {
            _onReply = onReply;

            if (msg.isSystemMessage)
            {
                systemMessageStyle?.SetActive(true);
                messageText.text = msg.message;
                return;
            }

            usernameText.text = msg.username;
            messageText.text = msg.message;
            timeText.text = msg.timeAgo;
            vipBadge.SetActive(msg.isVip);

            replyButton.onClick.AddListener(() => _onReply?.Invoke(msg));

            if (msg.replyToId > 0)
            {
                replyBadge.SetActive(true);
                replyText.text = $"@{msg.replyToUsername}";
            }

            if (!string.IsNullOrEmpty(msg.avatarUrl))
                StartCoroutine(ImageLoader.Load(msg.avatarUrl, avatarImage));
        }
    }
}
