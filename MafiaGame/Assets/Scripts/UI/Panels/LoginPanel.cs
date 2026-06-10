using UnityEngine;
using TMPro;
using UnityEngine.UI;
using Mafia.Player;

namespace Mafia.UI.Panels
{
    public class LoginPanel : MonoBehaviour
    {
        [SerializeField] private TMP_InputField emailInput;
        [SerializeField] private TMP_InputField passwordInput;
        [SerializeField] private Button loginButton;
        [SerializeField] private Button switchToRegisterButton;
        [SerializeField] private TMP_Text errorText;
        [SerializeField] private GameObject loadingOverlay;
        [SerializeField] private RegisterPanel registerPanel;

        void Start()
        {
            loginButton.onClick.AddListener(OnLogin);
            switchToRegisterButton.onClick.AddListener(() =>
            {
                gameObject.SetActive(false);
                registerPanel.gameObject.SetActive(true);
            });
            errorText.gameObject.SetActive(false);
        }

        private void OnLogin()
        {
            var email = emailInput.text.Trim();
            var password = passwordInput.text;

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                ShowError("შეავსე ყველა ველი");
                return;
            }

            SetLoading(true);
            AuthManager.Instance.Login(email, password,
                err => { SetLoading(false); ShowError(err); }
            );
        }

        private void ShowError(string msg)
        {
            errorText.text = msg;
            errorText.gameObject.SetActive(true);
        }

        private void SetLoading(bool loading)
        {
            loadingOverlay.SetActive(loading);
            loginButton.interactable = !loading;
        }
    }
}
