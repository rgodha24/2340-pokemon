import json

import pokebase as pb
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from api.models import (
    BarterTrade,
    MoneyTrade,
    Notification,
    Pokemon,
    Profile,
    TradeHistory,
)
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

        # Get or create user profile to access money
        try:
            profile = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=user)

        return JsonResponse(
            {
                "success": True,
                "user": {
                    "username": user.username,
                    "id": user.id,
                    "money": profile.money,
                },
            }
        )
    else:
        return JsonResponse(
            {"success": False, "error": "Invalid credentials"}, status=400
        )


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"success": True})


def search_marketplace(request):
    query = request.GET.get("q", "").strip().lower()
    results = []

    if query:
        pokemon_queryset = Pokemon.objects.filter(
            Q(name__icontains=query),
            Q(money_trade_listing__isnull=False)
            | Q(barter_trade_listing__isnull=False),
        ).select_related("user")

        for p in pokemon_queryset:
            results.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "image_url": p.image_url,
                    "rarity": p.rarity,
                    "types": p.types,
                    "owner": {"id": p.user.id, "username": p.user.username},
                    "money_trade": {
                        "id": p.money_trade_listing.id,
                        "amount_asked": p.money_trade_listing.amount_asked,
                    }
                    if hasattr(p, "money_trade_listing")
                    else None,
                    "barter_trade": {
                        "id": p.barter_trade_listing.id,
                        "trade_preferences": p.barter_trade_listing.trade_preferences,
                    }
                    if hasattr(p, "barter_trade_listing")
                    else None,
                }
            )

    return JsonResponse({"success": True, "results": results})


@require_GET
@login_required
def user_notifications(request):
    notifications = Notification.objects.filter(user=request.user).order_by(
        "-created_at"
    )
    return JsonResponse(
        {
            "success": True,
            "notifications": [
                {
                    "id": n.id,
                    "message": n.message,
                    "link": n.link,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
                for n in notifications
            ],
        }
    )


@require_POST
@login_required
def mark_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"success": True})


def filter_marketplace(request):
    rarity = request.GET.get("rarity")
    max_price = request.GET.get("max_price")
    ptype = request.GET.get("type")

    queryset = Pokemon.objects.filter(
        Q(money_trade_listing__isnull=False) | Q(barter_trade_listing__isnull=False)
    ).select_related("user")

    if rarity:
        queryset = queryset.filter(rarity=int(rarity))

    if max_price:
        queryset = queryset.filter(
            money_trade_listing__amount_asked__lte=int(max_price)
        )

    if ptype:
        queryset = queryset.filter(types__icontains=ptype.lower())

    results = []
    for p in queryset:
        results.append(
            {
                "id": p.id,
                "name": p.name,
                "image_url": p.image_url,
                "rarity": p.rarity,
                "types": p.types,
                "owner": {"id": p.user.id, "username": p.user.username},
                "money_trade": {
                    "id": p.money_trade_listing.id,
                    "amount_asked": p.money_trade_listing.amount_asked,
                }
                if hasattr(p, "money_trade_listing")
                else None,
                "barter_trade": {
                    "id": p.barter_trade_listing.id,
                    "trade_preferences": p.barter_trade_listing.trade_preferences,
                }
                if hasattr(p, "barter_trade_listing")
                else None,
            }
        )

    return JsonResponse({"success": True, "results": results})


def user_view(request):
    if request.user.is_authenticated:
        # Get or create user profile to access money
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=request.user)

        return JsonResponse(
            {
                "isAuthenticated": True,
                "user": {
                    "username": request.user.username,
                    "id": request.user.id,
                    "money": profile.money,
                },
            }
        )
    return JsonResponse({"isAuthenticated": False})


def user_username(_, username):
    user = get_object_or_404(User, username=username)

    # Get user profile for money information
    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        profile = Profile.objects.create(user=user)

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
                "money": profile.money,
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

    # Create user profile with default money amount
    profile = Profile.objects.create(user=user)

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
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "money": profile.money,
            },
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


def trade_history_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    history = (
        TradeHistory.objects.filter(Q(buyer=request.user) | Q(seller=request.user))
        .select_related("pokemon", "buyer", "seller")
        .order_by("-timestamp")
    )

    results = [
        {
            "pokemon_name": h.pokemon.name if h.pokemon else "Unknown",
            "amount": h.amount,
            "buyer": h.buyer.username,
            "seller": h.seller.username,
            "timestamp": h.timestamp.isoformat(),
        }
        for h in history
    ]

    return JsonResponse({"success": True, "history": results})


@require_POST
def buy_pokemon(request, pokemon_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    try:
        pokemon = (
            Pokemon.objects.select_related("user")
            .prefetch_related("money_trade_listing")
            .get(id=pokemon_id)
        )
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found"}, status=404
        )

    # Check if this is the user's own pokemon
    if pokemon.user == request.user:
        return JsonResponse(
            {"success": False, "error": "You cannot buy your own Pokemon"}, status=400
        )

    # Check if the pokemon is up for money trade
    try:
        money_trade = pokemon.money_trade_listing
    except MoneyTrade.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "This Pokemon is not for sale"}, status=400
        )

    # Get buyer and seller profiles
    from django.db import transaction

    try:
        buyer_profile = Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        buyer_profile = Profile.objects.create(user=request.user)

    try:
        seller_profile = Profile.objects.get(user=pokemon.user)
    except Profile.DoesNotExist:
        seller_profile = Profile.objects.create(user=pokemon.user)

    # Check if buyer has enough money
    if buyer_profile.money < money_trade.amount_asked:
        return JsonResponse(
            {
                "success": False,
                "error": "You don't have enough money for this purchase",
            },
            status=400,
        )

    # Process the transaction
    with transaction.atomic():
        # Transfer money
        buyer_profile.money -= money_trade.amount_asked
        seller_profile.money += money_trade.amount_asked
        buyer_profile.save()
        seller_profile.save()

        # Transfer ownership
        old_owner = pokemon.user
        pokemon.user = request.user
        pokemon.save()

        # Delete the trade
        money_trade.delete()

        TradeHistory.objects.create(
            buyer=request.user,
            seller=old_owner,
            pokemon=pokemon,
            amount=money_trade.amount_asked,
        )

        Notification.objects.create(
            user=old_owner,
            message=(
                f"Your Pokémon {pokemon.name} was sold to "
                f"{request.user.username} for ${money_trade.amount_asked}."
            ),
            link=f"/pokemon/{pokemon.id}",
        )
        Notification.objects.create(
            user=request.user,
            message=(
                f"You bought {pokemon.name} from "
                f"{old_owner.username} for ${money_trade.amount_asked}."
            ),
            link=f"/pokemon/{pokemon.id}",
        )

    return JsonResponse(
        {
            "success": True,
            "message": f"You successfully bought {pokemon.name} for ${money_trade.amount_asked}",
            "pokemon": {
                "id": pokemon.id,
                "name": pokemon.name,
                "previous_owner": old_owner.username,
            },
            "money_remaining": buyer_profile.money,
        }
    )
