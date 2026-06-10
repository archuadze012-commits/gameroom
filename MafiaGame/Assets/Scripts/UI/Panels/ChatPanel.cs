using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Mafia.Chat;
using Mafia.Data;

namespace Mafia.UI.Panels
{
    public class ChatPanel : MonoBehaviour
    {
        [SerializeField] private Transform messagesContainer;
        [SerializeField] private GameObject messagePrefab;
        [SerializeField] private ScrollRect scrollRect;
        [SerializeField] private TMP_InputField messageInput;
        [SerializeField] private Button sendButton;
        [SerializeField] private Button closeButton;
        [SerializeField] private GameObject replyBar;
        [SerializeField] private TMP_Text replyToText;
        [SerializeField] private Button clearReplyButton;

        void Start()
        {
            sendButton.onClick.AddListener(OnSend);
            closeButton.onClick.AddListener(() => gameObject.SetActive(false));
            clearReplyButton.onClick.AddListener(ClearReply);
            replyBar.SetActive(false);

            ChatManager.Instance.OnMessageReceived += AppendMessage;

            foreach (var msg in ChatManager.Instance.Messages)
                AppendMessage(msg);

            ScrollToBottom();
        }

        void OnDestroy()
        {
            if (ChatManager.Instance != null)
                ChatManager.Instance.OnMessageReceived -= AppendMessage;
        }

        private void OnSend()
        {
            var text = messageInput.text.Trim();
            if (string.IsNullOrEmpty(text)) return;
            ChatManager.Instance.SendMessage(text);
            messageInput.text = "";
            messageInput.ActivateInputField();
        }

        private void AppendMessage(ChatMessage msg)
        {
            var go = Instantiate(messagePrefab, messagesContainer);
            go.GetComponent<ChatMessageView>().Init(msg, OnReply);
            ScrollToBottom();
        }

        private void OnReply(ChatMessage msg)
        {
            ChatManager.Instance.SetReply(msg.id);
            replyBar.SetActive(true);
            replyToText.text = $"@{msg.username}: {msg.message[..Mathf.Min(msg.message.Length, 40)]}";
        }

        private void ClearReply()
        {
            ChatManager.Instance.ClearReply();
            replyBar.SetActive(false);
        }

        private void ScrollToBottom()
        {
            Canvas.ForceUpdateCanvases();
            scrollRect.verticalNormalizedPosition = 0f;
        }
    }
}
