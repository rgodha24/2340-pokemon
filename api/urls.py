from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("signup/", views.signup_view, name="signup"),
    path("user/", views.user_view, name="user"),
    path("user/<str:username>", views.user_username, name="user profile"),
    path("pokemon/<int:pokemon_id>/", views.pokemon_detail, name="pokemon_detail"),
    path(
        "pokemon/<int:pokemon_id>/trade/money/",
        views.create_money_trade,
        name="create_money_trade",
    ),
    path(
        "pokemon/<int:pokemon_id>/trade/barter/",
        views.create_barter_trade,
        name="create_barter_trade",
    ),
    path(
        "pokemon/<int:pokemon_id>/trade/cancel/",
        views.cancel_trade,
        name="cancel_trade",
    ),
    path("pokemon/<int:pokemon_id>/buy/", views.buy_pokemon, name="buy_pokemon"),
    path("marketplace/search/", views.search_marketplace, name="search_marketplace"),
    path("marketplace/filter/", views.filter_marketplace, name="filter_marketplace"),
    path("marketplace/history/", views.trade_history_view, name="trade_history"),
    path("notifications/", views.user_notifications, name="notifications"),
    path(
        "notifications/read/", views.mark_notifications_read, name="notifications_read"
    ),
]
