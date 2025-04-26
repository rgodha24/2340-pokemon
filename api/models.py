from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    money = models.IntegerField(default=100)

    def __str__(self):
        return f"{self.user.username}'s profile"


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


class TradeHistory(models.Model):
    buyer = models.ForeignKey(User, related_name="purchases", on_delete=models.CASCADE)
    seller = models.ForeignKey(User, related_name="sales", on_delete=models.CASCADE)
    pokemon = models.ForeignKey(Pokemon, on_delete=models.SET_NULL, null=True)
    amount = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    admin_notes = models.TextField(blank=True, null=True)
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True, null=True)

class TradeRequest(models.Model):
    sender = models.ForeignKey(User, related_name="sent_trades", on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name="received_trades", on_delete=models.CASCADE)
    sender_pokemon = models.ForeignKey("Pokemon", related_name="offered_in_trades", on_delete=models.CASCADE)
    receiver_pokemon = models.ForeignKey("Pokemon", related_name="requested_in_trades", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=10,
        choices=[("pending", "Pending"), ("accepted", "Accepted"), ("declined", "Declined")],
        default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    

class Notification(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    message = models.TextField()
    link = models.URLField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification({self.id}) to {self.user.username}"


class MoneyTrade(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('flagged', 'Flagged'),
        ('removed', 'Removed'),
    ]
    
    pokemon = models.OneToOneField(
        Pokemon, on_delete=models.CASCADE, related_name="money_trade_listing"
    )
    amount_asked = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def owner(self):
        return self.pokemon.user

    def __str__(self):
        return f"{self.pokemon.name} for ${self.amount_asked}"


class BarterTrade(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('flagged', 'Flagged'),
        ('removed', 'Removed'),
    ]
    
    pokemon = models.OneToOneField(
        Pokemon, on_delete=models.CASCADE, related_name="barter_trade_listing"
    )
    trade_preferences = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def owner(self):
        return self.pokemon.user

    def __str__(self):
        return f"Barter for {self.pokemon.name}"


class TradeReport(models.Model):
    REPORT_STATUS = [
        ('pending', 'Pending'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_reports')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=REPORT_STATUS, default='pending')
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='resolved_reports')
    
    # Polymorphic relationship to either MoneyTrade or BarterTrade
    money_trade = models.ForeignKey(MoneyTrade, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    barter_trade = models.ForeignKey(BarterTrade, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')

    def __str__(self):
        trade = self.money_trade or self.barter_trade
        return f"Report on {trade} by {self.reporter.username}"