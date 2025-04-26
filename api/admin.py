from django.contrib import admin
from .models import MoneyTrade, BarterTrade, TradeHistory, TradeReport
from django.utils import timezone

def admin_action(description):
    def decorator(func):
        func.short_description = description
        return func
    return decorator

@admin.register(MoneyTrade)
class MoneyTradeAdmin(admin.ModelAdmin):
    list_display = ('pokemon', 'owner', 'amount_asked', 'status', 'is_flagged', 'created_at')
    list_filter = ('status', 'is_flagged', 'created_at')
    search_fields = ('pokemon__name', 'pokemon__user__username')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['flag_trades', 'unflag_trades', 'remove_trades']

    @admin_action("Flag selected trades")
    def flag_trades(self, request, queryset):
        queryset.update(is_flagged=True, status='flagged')

    @admin_action("Unflag selected trades")
    def unflag_trades(self, request, queryset):
        queryset.update(is_flagged=False, status='active')

    @admin_action("Remove selected trades")
    def remove_trades(self, request, queryset):
        queryset.update(status='removed')

@admin.register(BarterTrade)
class BarterTradeAdmin(admin.ModelAdmin):
    list_display = ('pokemon', 'owner', 'status', 'is_flagged', 'created_at')
    list_filter = ('status', 'is_flagged', 'created_at')
    search_fields = ('pokemon__name', 'pokemon__user__username', 'trade_preferences')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['flag_trades', 'unflag_trades', 'remove_trades']

    @admin_action("Flag selected trades")
    def flag_trades(self, request, queryset):
        queryset.update(is_flagged=True, status='flagged')

    @admin_action("Unflag selected trades")
    def unflag_trades(self, request, queryset):
        queryset.update(is_flagged=False, status='active')

    @admin_action("Remove selected trades")
    def remove_trades(self, request, queryset):
        queryset.update(status='removed')

@admin.register(TradeHistory)
class TradeHistoryAdmin(admin.ModelAdmin):
    list_display = ('pokemon', 'buyer', 'seller', 'amount', 'timestamp', 'is_flagged')
    list_filter = ('timestamp', 'is_flagged')
    search_fields = ('pokemon__name', 'buyer__username', 'seller__username')
    readonly_fields = ('timestamp',)
    actions = ['flag_trades', 'unflag_trades']

    @admin_action("Flag selected trades")
    def flag_trades(self, request, queryset):
        queryset.update(is_flagged=True)

    @admin_action("Unflag selected trades")
    def unflag_trades(self, request, queryset):
        queryset.update(is_flagged=False)

@admin.register(TradeReport)
class TradeReportAdmin(admin.ModelAdmin):
    list_display = ('get_trade_info', 'reporter', 'status', 'created_at', 'resolved_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reporter__username', 'reason', 'admin_notes')
    readonly_fields = ('created_at',)
    actions = ['mark_investigating', 'mark_resolved', 'mark_dismissed']

    @admin_action("Trade")
    def get_trade_info(self, obj):
        return str(obj.money_trade or obj.barter_trade)

    @admin_action("Mark selected reports as investigating")
    def mark_investigating(self, request, queryset):
        queryset.update(status='investigating')

    @admin_action("Mark selected reports as resolved")
    def mark_resolved(self, request, queryset):
        queryset.update(status='resolved', resolved_by=request.user, resolved_at=timezone.now())

    @admin_action("Mark selected reports as dismissed")
    def mark_dismissed(self, request, queryset):
        queryset.update(status='dismissed', resolved_by=request.user, resolved_at=timezone.now())
