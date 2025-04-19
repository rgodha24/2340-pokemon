from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    money = models.IntegerField(default=100)

    def __str__(self):
        return f"{self.user.username}'s profile"

class TradeHistory(models.Model):
    buyer = models.ForeignKey(User, related_name="purchases", on_delete=models.CASCADE)
    seller = models.ForeignKey(User, related_name="sales", on_delete=models.CASCADE)
    pokemon = models.ForeignKey(Pokemon, on_delete=models.SET_NULL, null=True)
    amount = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)


class Pokemon(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pokemon")
    pokeapi_id = models.IntegerField(unique=True, db_index=True)
    name = models.CharField(max_length=100)
    rarity = models.IntegerField()
    image_url = models.URLField(max_length=255, blank=True, null=True)
    types = models.JSONField(default=list)
    offered_in_trade = models.ForeignKey(
        "BarterTrade",
        on_delete=models.SET_NULL,
        related_name="offered_pokemon",
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.name


class MoneyTrade(models.Model):
    pokemon = models.OneToOneField(
        Pokemon, on_delete=models.CASCADE, related_name="money_trade_listing"
    )
    amount_asked = models.IntegerField()

    @property
    def owner(self):
        return self.pokemon.user

    def __str__(self):
        return f"{self.pokemon.name} for ${self.amount_asked}"


class BarterTrade(models.Model):
    pokemon = models.OneToOneField(
        Pokemon, on_delete=models.CASCADE, related_name="barter_trade_listing"
    )
    trade_preferences = models.TextField(blank=True, default="")

    @property
    def owner(self):
        return self.pokemon.user

    def __str__(self):
        return f"Barter for {self.pokemon.name}"
