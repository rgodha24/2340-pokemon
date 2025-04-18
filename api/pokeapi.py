import random

import pokebase as pb


def random_pokemon():
    species_list = pb.APIResourceList("pokemon-species")
    pokemon_count = species_list.count
    random_id = random.randint(1, pokemon_count)
    return pb.pokemon(random_id)
