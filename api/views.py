import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from api.models import MoneyTrade, BarterTrade


def index(request):
    data = {"message": "Hello World"}
    return JsonResponse(data, safe=False)


@require_POST
def login_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        return JsonResponse(
            {"success": True, "user": {"username": user.username, "id": user.id}}
        )
    else:
        return JsonResponse(
            {"success": False, "error": "Invalid credentials"}, status=400
        )


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"success": True})


def user_view(request):
    if request.user.is_authenticated:
        return JsonResponse(
            {
                "isAuthenticated": True,
                "user": {"username": request.user.username, "id": request.user.id},
            }
        )
    return JsonResponse({"isAuthenticated": False})


def user_username(request, username):
    try:
        user = User.objects.get(username=username)

        # Get user's pokemon
        pokemon_list = user.pokemon.all().values("id", "pokeapi_id", "name")

        # Get open trades for each pokemon
        for pokemon in pokemon_list:
            pokemon_obj = user.pokemon.get(id=pokemon["id"])
            try:
                money_trade = pokemon_obj.money_trade_listing
                pokemon["money_trades"] = [{"id": money_trade.id, "amount_asked": money_trade.amount_asked, "status": money_trade.status}] if money_trade.status == "open" else []
            except:
                pokemon["money_trades"] = []
            
            try:
                barter_trade = pokemon_obj.barter_trade_listing
                pokemon["barter_trades"] = [{"id": barter_trade.id, "trade_preferences": barter_trade.trade_preferences, "status": barter_trade.status}] if barter_trade.status == "open" else []
            except:
                pokemon["barter_trades"] = []

        # Get all of user's open trades
        
        # Get all money trades for this user's pokemon
        money_trades = list(MoneyTrade.objects.filter(
            pokemon__user=user,
            status="open"
        ).values(
            "id", "amount_asked", "status", "pokemon__id", "pokemon__name"
        ))
        
        # Get all barter trades for this user's pokemon
        barter_trades = list(BarterTrade.objects.filter(
            pokemon__user=user,
            status="open"
        ).values(
            "id", "trade_preferences", "status", "pokemon__id", "pokemon__name"
        ))

        return JsonResponse(
            {
                "success": True,
                "user": {
                    "id": user.id,
                    "username": user.username,
                },
                "pokemon": list(pokemon_list),
                "open_trades": {
                    "money_trades": money_trades,
                    "barter_trades": barter_trades,
                },
            }
        )
    except User.DoesNotExist:
        return JsonResponse({"success": False, "error": "User not found"}, status=404)


@require_POST
def signup_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")
    email = data.get("email", "")

    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"success": False, "error": "Username already exists"}, status=400
        )

    # Create the user
    user = User.objects.create_user(username=username, email=email, password=password)

    return JsonResponse(
        {
            "success": True,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        },
        status=201,
    )
