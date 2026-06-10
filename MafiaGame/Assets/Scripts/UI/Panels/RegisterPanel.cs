using UnityEngine;
using TMPro;
using UnityEngine.UI;
using Mafia.Player;

namespace Mafia.UI.Panels
{
    public class RegisterPanel : MonoBehaviour
    {
        [SerializeField] private TMP_InputField usernameInput;
        [SerializeField] private TMP_InputField emailInput;
        [SerializeField] private TMP_InputField passwordInput;
        [SerializeField] private TMP_InputField passwordConfirmInput;
        [SerializeField] private Button registerButton;
        [SerializeField] private Button switchToLoginButton;
        [SerializeField] private TMP_Text errorText;
        [SerializeField] private GameObject loadingOverlay;
        [SerializeField] private LoginPanel loginPanel;

        void Start()
        {
            registerButton.onClick.AddListener(OnRegister);
            switchToLoginButton.onClick.AddListener(() =>
            {
                gameObject.SetActive(false);
                loginPanel.gameObject.SetActive(true);
            });
            errorText.gameObject.SetActive(false);
        }

        private void OnRegister()
        {
            var username = usernameInput.text.Trim();
            var email = emailInput.text.Trim();
            var pass = passwordInput.text;
            var passConfirm = passwordConfirmInput.text;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(pass))
            {
                ShowError("შეავსე ყველა ველი");
                return;
            }

            if (pass != passConfirm)
            {
                ShowError("პაროლები არ ემთხვევა");
                return;
            }

            SetLoading(true);
            AuthManager.Instance.Register(username, email, pass, passConfirm,
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
            registerButton.interactable = !loading;
        }
    }
}
