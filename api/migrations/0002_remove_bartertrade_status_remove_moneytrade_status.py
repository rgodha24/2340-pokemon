# Generated by Django 5.2 on 2025-04-18 21:47

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='bartertrade',
            name='status',
        ),
        migrations.RemoveField(
            model_name='moneytrade',
            name='status',
        ),
    ]
