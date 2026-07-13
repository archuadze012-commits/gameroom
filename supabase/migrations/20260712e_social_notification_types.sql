-- Social-interaction notification types. The realtime in-app notification
-- system (notifications table + HomeNotificationsWidget realtime subscription)
-- already exists, but the core feed interactions never populated it: a post
-- comment created no notification at all, and a follow only fired a push (no
-- in-app row, so push-less users — most of them — saw nothing). These two enum
-- values let those events write proper typed notifications (wired in
-- app/api/posts/[id]/comments and app/api/follows/[username]).
alter type public.notification_type add value if not exists 'follow';
alter type public.notification_type add value if not exists 'post_comment';
