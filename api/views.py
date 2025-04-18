import json

import pokebase as pb
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST

from api.models import BarterTrade, MoneyTrade, Pokemon
from api.pokeapi import random_pokemon


def index(_):
    data = {"message": "Hello World"}
    return JsonResponse(data)


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


def user_username(_, username):
    user = get_object_or_404(User, username=username)

    pokemon_queryset = Pokemon.objects.filter(user=user).prefetch_related(
        "money_trade_listing", "barter_trade_listing"
    )

    pokemon_data = []
    for pokemon in pokemon_queryset:
        p_dict = {
            "id": pokemon.id,
            "pokeapi_id": pokemon.pokeapi_id,
            "name": pokemon.name,
            "rarity": pokemon.rarity,
            "image_url": pokemon.image_url,
            "types": pokemon.types,
            "money_trade": None,
            "barter_trade": None,
        }

        try:
            trade = pokemon.money_trade_listing
            p_dict["money_trade"] = {
                "id": trade.id,
                "amount_asked": trade.amount_asked,
            }
        except MoneyTrade.DoesNotExist:
            pass

        try:
            trade = pokemon.barter_trade_listing
            p_dict["barter_trade"] = {
                "id": trade.id,
                "trade_preferences": trade.trade_preferences,
            }
        except BarterTrade.DoesNotExist:
            pass

        pokemon_data.append(p_dict)

    money_trades = list(
        MoneyTrade.objects.filter(pokemon__user=user).values(
            "id", "amount_asked", "pokemon__id", "pokemon__name"
        )
    )
    barter_trades = list(
        BarterTrade.objects.filter(pokemon__user=user).values(
            "id", "trade_preferences", "pokemon__id", "pokemon__name"
        )
    )

    return JsonResponse(
        {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
            },
            "pokemon": pokemon_data,
            "open_trades": {
                "money_trades": money_trades,
                "barter_trades": barter_trades,
            },
        }
    )


@require_POST
def signup_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")
    email = data.get("email", "")

    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"success": False, "error": "Username already exists"}, status=400
        )

    user = User.objects.create_user(username=username, email=email, password=password)
    user_pokemon = []

    for _ in range(5):
        pokeapi_data = random_pokemon()
        pokemon_name = pokeapi_data.name
        pokemon_id = pokeapi_data.id
        pokemon_types = [t.type.name for t in pokeapi_data.types]

        image_url = None
        if hasattr(pokeapi_data.sprites.other, "official_artwork"):
            official_artwork = pokeapi_data.sprites.other.official_artwork
            if (
                hasattr(official_artwork, "front_default")
                and official_artwork.front_default
            ):
                image_url = official_artwork.front_default

        if not image_url and hasattr(pokeapi_data.sprites, "front_default"):
            image_url = pokeapi_data.sprites.front_default

        species_data = pb.pokemon_species(pokemon_id)
        capture_rate = species_data.capture_rate
        if capture_rate <= 10:
            rarity = 5
        elif capture_rate <= 30:
            rarity = 4
        elif capture_rate <= 70:
            rarity = 3
        elif capture_rate <= 150:
            rarity = 2
        else:
            rarity = 1

        pokemon_instance = Pokemon(
            user=user,
            pokeapi_id=pokemon_id,
            name=pokemon_name,
            rarity=rarity,
            image_url=image_url,
            types=pokemon_types,
        )
        user_pokemon.append(pokemon_instance)

    Pokemon.objects.bulk_create(user_pokemon)

    return JsonResponse(
        {
            "success": True,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        },
        status=201,
    )


def pokemon_detail(request, pokemon_id):
    pokemon = get_object_or_404(Pokemon, id=pokemon_id)

    pokemon_data = {
        "id": pokemon.id,
        "pokeapi_id": pokemon.pokeapi_id,
        "name": pokemon.name,
        "rarity": pokemon.rarity,
        "image_url": pokemon.image_url,
        "types": pokemon.types,
        "owner": {
            "id": pokemon.user.id,
            "username": pokemon.user.username,
        },
        "is_owner": request.user.is_authenticated
        and request.user.id == pokemon.user.id,
        "money_trade": None,
        "barter_trade": None,
    }

    try:
        money_trade = pokemon.money_trade_listing
        pokemon_data["money_trade"] = {
            "id": money_trade.id,
            "amount_asked": money_trade.amount_asked,
        }
    except MoneyTrade.DoesNotExist:
        pass

    try:
        barter_trade = pokemon.barter_trade_listing
        pokemon_data["barter_trade"] = {
            "id": barter_trade.id,
            "trade_preferences": barter_trade.trade_preferences,
        }
    except BarterTrade.DoesNotExist:
        pass

    return JsonResponse({"success": True, "pokemon": pokemon_data})


@require_POST
def create_money_trade(request, pokemon_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    data = json.loads(request.body)
    amount_asked = data.get("amount_asked")

    if not amount_asked or not isinstance(amount_asked, int) or amount_asked <= 0:
        return JsonResponse(
            {"success": False, "error": "Valid positive amount required"}, status=400
        )

    try:
        pokemon = (
            Pokemon.objects.select_related("user")
            .prefetch_related("money_trade_listing", "barter_trade_listing")
            .get(id=pokemon_id, user=request.user)
        )
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    if hasattr(pokemon, "money_trade_listing") or hasattr(
        pokemon, "barter_trade_listing"
    ):
        return JsonResponse(
            {"success": False, "error": "Pokemon is already listed in a trade"},
            status=400,
        )

    trade = MoneyTrade.objects.create(
        pokemon=pokemon,
        amount_asked=amount_asked,
    )

    return JsonResponse(
        {
            "success": True,
            "trade": {
                "id": trade.id,
                "amount_asked": trade.amount_asked,
                "pokemon_id": pokemon.id,
            },
        },
        status=201,
    )


@require_POST
def create_barter_trade(request, pokemon_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    data = json.loads(request.body)
    trade_preferences = data.get("trade_preferences", "")

    try:
        pokemon = (
            Pokemon.objects.select_related("user")
            .prefetch_related("money_trade_listing", "barter_trade_listing")
            .get(id=pokemon_id, user=request.user)
        )
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    if hasattr(pokemon, "money_trade_listing") or hasattr(
        pokemon, "barter_trade_listing"
    ):
        return JsonResponse(
            {"success": False, "error": "Pokemon is already listed in a trade"},
            status=400,
        )

    trade = BarterTrade.objects.create(
        pokemon=pokemon,
        trade_preferences=trade_preferences,
    )

    return JsonResponse(
        {
            "success": True,
            "trade": {
                "id": trade.id,
                "trade_preferences": trade.trade_preferences,
                "pokemon_id": pokemon.id,
            },
        },
        status=201,
    )


@require_POST
def cancel_trade(request, pokemon_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    try:
        pokemon = Pokemon.objects.prefetch_related(
            "money_trade_listing", "barter_trade_listing"
        ).get(id=pokemon_id, user=request.user)
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    deleted_trade = False
    try:
        trade = pokemon.money_trade_listing
        trade.delete()
        deleted_trade = True
    except MoneyTrade.DoesNotExist:
        pass

    try:
        trade = pokemon.barter_trade_listing
        Pokemon.objects.filter(offered_in_trade=trade).update(offered_in_trade=None)
        trade.delete()
        deleted_trade = True
    except BarterTrade.DoesNotExist:
        pass

    if deleted_trade:
        return JsonResponse(
            {"success": True, "message": "Trade listing deleted successfully."}
        )
    else:
        return JsonResponse(
            {
                "success": True,
                "message": "No active trade listing found for this Pokemon to cancel.",
            }
        )
