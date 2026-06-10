using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Map
{
    public class MapSlotView : MonoBehaviour, IPointerClickHandler
    {
        [SerializeField] private Image buildingImage;
        [SerializeField] private Image slotBackground;
        [SerializeField] private GameObject constructionOverlay;
        [SerializeField] private TMP_Text constructionTimerText;
        [SerializeField] private GameObject ownerBadge;
        [SerializeField] private TMP_Text levelText;
        [SerializeField] private GameObject productionIndicator;

        public MapSlot SlotData { get; private set; }

        private float _constructionTimer;

        public void Init(MapSlot slot)
        {
            SlotData = slot;
            UpdateVisuals();
        }

        public void Refresh(MapSlot slot)
        {
            SlotData = slot;
            UpdateVisuals();
        }

        private void UpdateVisuals()
        {
            var building = SlotData.building;

            constructionOverlay.SetActive(false);
            ownerBadge.SetActive(SlotData.isOwned);
            levelText.gameObject.SetActive(false);
            productionIndicator.SetActive(false);

            if (building == null)
            {
                buildingImage.gameObject.SetActive(false);
                return;
            }

            buildingImage.gameObject.SetActive(true);

            if (!string.IsNullOrEmpty(building.imageUrl))
                StartCoroutine(ImageLoader.Load(building.imageUrl, buildingImage));

            if (building.state == BuildingState.UnderConstruction)
            {
                constructionOverlay.SetActive(true);
                _constructionTimer = building.constructionTimeRemaining;
            }
            else if (building.state == BuildingState.Built)
            {
                levelText.gameObject.SetActive(true);
                levelText.text = $"Lv{building.level}";
                productionIndicator.SetActive(building.production?.moneyPerHour > 0);
            }
        }

        void Update()
        {
            if (!constructionOverlay.activeSelf) return;
            _constructionTimer -= Time.deltaTime;
            if (_constructionTimer <= 0)
            {
                constructionOverlay.SetActive(false);
                MapManager.Instance.RefreshSlot(SlotData.slotId);
                return;
            }
            constructionTimerText.text = FormatTime(_constructionTimer);
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            MapManager.Instance.SelectSlot(SlotData.slotId);
        }

        private string FormatTime(float seconds)
        {
            var ts = System.TimeSpan.FromSeconds(seconds);
            return ts.TotalHours >= 1
                ? $"{(int)ts.TotalHours}h {ts.Minutes}m"
                : $"{ts.Minutes}m {ts.Seconds}s";
        }
    }
}
