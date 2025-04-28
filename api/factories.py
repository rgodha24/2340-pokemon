import pokebase as pb
from django.utils import timezone

from .models import (
    BarterTrade,
    MoneyTrade,
    Notification,
    Pokemon,
    Profile,
    TradeHistory,
    TradeRequest,
    User,
)


# --- Formatting Helpers (Factories for JSON data structures) ---
def format_user_data(user: User, profile: Profile | None = None) -> dict:
    """Formats user data for JSON responses."""
    if profile is None:
        try:
            profile = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=user)
    return {
        "id": user.id,
        "username": user.username,
        "money": profile.money,
    }


def format_simple_user_data(user: User) -> dict:
    """Formats basic user data (ID and username)."""
    return {
        "id": user.id,
        "username": user.username,
    }


def format_money_trade_data(trade: MoneyTrade) -> dict | None:
    """Formats MoneyTrade data for JSON responses."""
    if not trade:
        return None
    return {
        "id": trade.id,
        "amount_asked": trade.amount_asked,
        "status": trade.status,
    }


def format_barter_trade_data(trade: BarterTrade) -> dict | None:
    """Formats BarterTrade data for JSON responses."""
    if not trade:
        return None
    return {
        "id": trade.id,
        "trade_preferences": trade.trade_preferences,
        "status": trade.status,
    }


def format_pokemon_data(pokemon: Pokemon, request_user: User = None) -> dict:
    """Formats Pokemon data for JSON responses, including trade info."""
    data = {
        "id": pokemon.id,
        "pokeapi_id": pokemon.pokeapi_id,
        "name": pokemon.name,
        "rarity": pokemon.rarity,
        "image_url": pokemon.image_url,
        "types": pokemon.types,
        "owner": format_simple_user_data(pokemon.user),
        "money_trade": None,
        "barter_trade": None,
    }

    try:
        data["money_trade"] = format_money_trade_data(pokemon.money_trade_listing)
    except (MoneyTrade.DoesNotExist, AttributeError):
        pass

    try:
        data["barter_trade"] = format_barter_trade_data(pokemon.barter_trade_listing)
    except (BarterTrade.DoesNotExist, AttributeError):
        pass

    if request_user:
        data["is_owner"] = (
            request_user.is_authenticated and request_user.id == pokemon.user.id
        )

    return data


def format_notification_data(notification: Notification) -> dict:
    """Formats Notification data for JSON responses."""
    return {
        "id": notification.id,
        "message": notification.message,
        "link": notification.link,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }


def format_trade_history_data(history: TradeHistory) -> dict:
    """Formats TradeHistory data for JSON responses."""
    trade_type = "money" if history.amount > 0 else "barter"
    return {
        "trade_type": trade_type,
        "pokemon_name": history.pokemon.name if history.pokemon else "Unknown",
        "amount": history.amount,
        "buyer": history.buyer.username,
        "seller": history.seller.username,
        "timestamp": history.timestamp.isoformat(),
    }


def format_trade_request_data(trade: TradeRequest) -> dict:
    """Formats TradeRequest data for JSON responses."""
    return {
        "id": trade.id,
        "sender": format_simple_user_data(trade.sender),
        "receiver": format_simple_user_data(trade.receiver),
        "sender_pokemon": {
            "id": trade.sender_pokemon.id,
            "name": trade.sender_pokemon.name,
            "image_url": trade.sender_pokemon.image_url,
        },
        "receiver_pokemon": {
            "id": trade.receiver_pokemon.id,
            "name": trade.receiver_pokemon.name,
            "image_url": trade.receiver_pokemon.image_url,
        },
        "status": trade.status,
        "created_at": trade.created_at.isoformat(),
    }


# --- Model Instance Factories ---
class PokemonFactory:
    @staticmethod
    def _calculate_rarity(pokeapi_id: int) -> int:
        """Calculates rarity based on capture rate."""
        try:
            species_data = pb.pokemon_species(pokeapi_id)
            capture_rate = species_data.capture_rate
            if capture_rate <= 10:
                return 5
            elif capture_rate <= 30:
                return 4
            elif capture_rate <= 70:
                return 3
            elif capture_rate <= 150:
                return 2
            else:
                return 1
        except Exception:
            # Default rarity if API fails
            return 1

    @staticmethod
    def _get_image_url(sprites) -> str | None:
        """Extracts the best available image URL from sprites."""
        image_url = None
        if hasattr(sprites.other, "official_artwork"):
            official_artwork = sprites.other.official_artwork
            if (
                hasattr(official_artwork, "front_default")
                and official_artwork.front_default
            ):
                image_url = official_artwork.front_default

        if not image_url and hasattr(sprites, "front_default"):
            image_url = sprites.front_default
        return image_url

    def create_pokemon_instance(self, user: User, pokeapi_data) -> Pokemon:
        """Creates a Pokemon instance (without saving) from PokeAPI data."""
        pokemon_id = pokeapi_data.id
        rarity = self._calculate_rarity(pokemon_id)
        image_url = self._get_image_url(pokeapi_data.sprites)
        types = [t.type.name for t in pokeapi_data.types]

        return Pokemon(
            user=user,
            pokeapi_id=pokemon_id,
            name=pokeapi_data.name,
            rarity=rarity,
            image_url=image_url,
            types=types,
        )


class TradeHistoryFactory:
    def create_trade_history(
        self,
        buyer: User,
        seller: User,
        pokemon: Pokemon,
        amount: int,
        timestamp=None,
    ) -> TradeHistory:
        """Creates a TradeHistory instance (without saving)."""
        return TradeHistory(
            buyer=buyer,
            seller=seller,
            pokemon=pokemon,
            amount=amount,
            timestamp=timestamp or timezone.now(),
        )

    def create_money_trade_history(
        self, buyer: User, seller: User, pokemon: Pokemon, amount: int
    ) -> TradeHistory:
        """Creates a TradeHistory instance for a money trade."""
        return self.create_trade_history(buyer, seller, pokemon, amount)

    def create_barter_trade_history(
        self, user1: User, user2: User, pokemon1: Pokemon, pokemon2: Pokemon
    ) -> list[TradeHistory]:
        """Creates two TradeHistory instances for a barter trade (one for each direction)."""
        now = timezone.now()
        # user1 receives pokemon2 from user2
        history1 = self.create_trade_history(
            buyer=user1, seller=user2, pokemon=pokemon2, amount=0, timestamp=now
        )
        # user2 receives pokemon1 from user1
        history2 = self.create_trade_history(
            buyer=user2, seller=user1, pokemon=pokemon1, amount=0, timestamp=now
        )
        return [history1, history2]


class NotificationFactory:
    def create_notification(
        self, user: User, message: str, link: str = None
    ) -> Notification:
        """Creates a Notification instance (without saving)."""
        return Notification(user=user, message=message, link=link)


# Instantiate factories for easy import
pokemon_factory = PokemonFactory()
trade_history_factory = TradeHistoryFactory()
notification_factory = NotificationFactory()
