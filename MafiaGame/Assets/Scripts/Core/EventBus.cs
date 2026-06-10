using System;
using System.Collections.Generic;

namespace Mafia.Core
{
    public enum GameEvent
    {
        PlayerDataUpdated,
        ResourceChanged,
        ChatMessageReceived,
        NotificationReceived,
        BuildingStateChanged,
        FarmStateChanged,
        ShipArrived,
        PlaneArrived,
        CrimeCompleted,
        CombatCompleted,
        LevelUp,
        AchievementUnlocked,
        GangMessageReceived,
        MapSlotSelected,
        ModalOpened,
        ModalClosed,
    }

    public static class EventBus
    {
        private static readonly Dictionary<GameEvent, List<Action<object>>> _listeners = new();

        public static void Subscribe(GameEvent evt, Action<object> handler)
        {
            if (!_listeners.ContainsKey(evt))
                _listeners[evt] = new List<Action<object>>();
            _listeners[evt].Add(handler);
        }

        public static void Unsubscribe(GameEvent evt, Action<object> handler)
        {
            if (_listeners.TryGetValue(evt, out var list))
                list.Remove(handler);
        }

        public static void Publish(GameEvent evt, object data = null)
        {
            if (!_listeners.TryGetValue(evt, out var list)) return;
            foreach (var h in list) h?.Invoke(data);
        }
    }
}
