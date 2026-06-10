using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Mafia.Core;
using Mafia.Data;
using Mafia.Network;

namespace Mafia.Map
{
    public class MapManager : MonoBehaviour
    {
        public static MapManager Instance { get; private set; }

        [Header("Slot Prefabs")]
        [SerializeField] private GameObject largeSlotPrefab;
        [SerializeField] private GameObject smallSlotPrefab;
        [SerializeField] private GameObject farmSlotPrefab;
        [SerializeField] private Transform mapContainer;

        [Header("Zoom")]
        [SerializeField] private float minZoom = 0.5f;
        [SerializeField] private float maxZoom = 2f;
        [SerializeField] private float zoomStep = 0.25f;

        private readonly Dictionary<int, MapSlotView> _slotViews = new();
        private float _currentZoom = 1f;
        private List<MapSlot> _slots = new();

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start() => LoadMap();

        public void LoadMap()
        {
            StartCoroutine(ApiClient.Instance.Get<MapResponse>("/api/map",
                response =>
                {
                    _slots = response.slots;
                    RenderMap();
                }
            ));
        }

        private void RenderMap()
        {
            foreach (Transform child in mapContainer)
                Destroy(child.gameObject);
            _slotViews.Clear();

            foreach (var slot in _slots)
            {
                var prefab = slot.size switch
                {
                    SlotSize.Large => largeSlotPrefab,
                    SlotSize.Small => smallSlotPrefab,
                    _ => farmSlotPrefab
                };

                var go = Instantiate(prefab, mapContainer);
                go.transform.localPosition = slot.position;

                var view = go.GetComponent<MapSlotView>();
                view.Init(slot);
                _slotViews[slot.slotId] = view;
            }
        }

        public void SelectSlot(int slotId)
        {
            if (_slotViews.TryGetValue(slotId, out var view))
                EventBus.Publish(GameEvent.MapSlotSelected, view.SlotData);
        }

        public void ZoomIn()  => SetZoom(_currentZoom + zoomStep);
        public void ZoomOut() => SetZoom(_currentZoom - zoomStep);

        private void SetZoom(float zoom)
        {
            _currentZoom = Mathf.Clamp(zoom, minZoom, maxZoom);
            mapContainer.localScale = Vector3.one * _currentZoom;
        }

        public void RefreshSlot(int slotId)
        {
            StartCoroutine(ApiClient.Instance.Get<MapSlot>($"/api/map/slot/{slotId}",
                slot =>
                {
                    if (_slotViews.TryGetValue(slotId, out var view))
                        view.Refresh(slot);
                }
            ));
        }

        [Serializable] private class MapResponse { public List<MapSlot> slots; }
    }
}
