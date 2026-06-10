using UnityEngine;
using TMPro;
using UnityEngine.UI;
using Mafia.Core;
using Mafia.Data;

namespace Mafia.UI.HUD
{
    public class HUDController : MonoBehaviour
    {
        [Header("Resources")]
        [SerializeField] private TMP_Text moneyText;
        [SerializeField] private TMP_Text dirtyMoneyText;
        [SerializeField] private TMP_Text crystalsText;

        [Header("Stats")]
        [SerializeField] private Slider hpBar;
        [SerializeField] private TMP_Text hpText;
        [SerializeField] private Slider energyBar;
        [SerializeField] private TMP_Text energyText;
        [SerializeField] private Slider awakeBar;
        [SerializeField] private TMP_Text awakeText;
        [SerializeField] private Slider nerveBar;
        [SerializeField] private TMP_Text nerveText;

        [Header("Player")]
        [SerializeField] private Image avatarImage;
        [SerializeField] private TMP_Text usernameText;
        [SerializeField] private TMP_Text levelText;
        [SerializeField] private Slider expBar;
        [SerializeField] private GameObject vipBadge;

        [Header("Timer")]
        [SerializeField] private TMP_Text timerText;

        void OnEnable()
        {
            EventBus.Subscribe(GameEvent.PlayerDataUpdated, _ => RefreshAll());
            EventBus.Subscribe(GameEvent.ResourceChanged, _ => RefreshResources());
        }

        void OnDisable()
        {
            EventBus.Unsubscribe(GameEvent.PlayerDataUpdated, _ => RefreshAll());
            EventBus.Unsubscribe(GameEvent.ResourceChanged, _ => RefreshResources());
        }

        void Start() => RefreshAll();

        private void RefreshAll()
        {
            RefreshResources();
            RefreshStats();
            RefreshProfile();
        }

        private void RefreshResources()
        {
            var p = GameManager.Instance.CurrentPlayer;
            if (p == null) return;
            moneyText.text = FormatNumber(p.money);
            dirtyMoneyText.text = FormatNumber(p.dirtyMoney);
            crystalsText.text = p.crystals.ToString();
        }

        private void RefreshStats()
        {
            var p = GameManager.Instance.CurrentPlayer;
            if (p == null) return;

            hpBar.value = p.HpPercent;
            hpText.text = p.hp.ToString();
            energyBar.value = p.EnergyPercent;
            energyText.text = p.energy.ToString();
            awakeBar.value = p.AwakePercent;
            awakeText.text = p.awake.ToString();
            nerveBar.value = p.NervePercent;
            nerveText.text = p.nerve.ToString();
        }

        private void RefreshProfile()
        {
            var p = GameManager.Instance.CurrentPlayer;
            if (p == null) return;

            usernameText.text = p.username;
            levelText.text = p.level.ToString();
            expBar.value = p.ExpPercent;
            vipBadge.SetActive(p.isVip);

            if (!string.IsNullOrEmpty(p.professionAvatar))
                StartCoroutine(Network.ImageLoader.Load(p.professionAvatar, avatarImage));
        }

        private string FormatNumber(long n)
        {
            if (n >= 1_000_000) return $"{n / 1_000_000f:0.#}M";
            if (n >= 1_000)     return $"{n / 1_000f:0.#}K";
            return n.ToString();
        }
    }
}
