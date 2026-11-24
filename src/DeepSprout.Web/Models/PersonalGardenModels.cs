namespace DeepSprout.Web.Models;

public sealed record PersonalGardenState(GardenTree[] Types, DateOnly[] RoutineDays, GardenSource[] Flowers,
    GardenSource[] Rabbits, GardenSource[] Birdhouses, GardenPolicy Policy);

public sealed record GardenTree(string Id, string Title, int Stage, GardenSource[] Sources);

public sealed record GardenSource(string Key, DateOnly On, string Title, string Detail, string Source,
    string? ContentVersion = null);

public sealed record GardenPolicy(int[] TreeSteps, string[] StageNames, int[] FlowerAt, int MaxRabbits, int MaxBirdhouses);
