using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class LapSystem : MonoBehaviour
{
    public static LapSystem Instance { get; private set; }

    [SerializeField] private WaypointCircuit waypointCircuit;
    [SerializeField] private int totalLaps = 3;

    private readonly List<RacerProgress> racers = new List<RacerProgress>();
    private float raceClock;

    public int TotalLaps => totalLaps;
    public WaypointCircuit Circuit => waypointCircuit;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
    }

    private void Start()
    {
        RacerIdentity[] allRacers = FindObjectsOfType<RacerIdentity>();
        foreach (RacerIdentity racer in allRacers)
        {
            RegisterRacer(racer);
        }
    }

    private void Update()
    {
        if (GameManager.Instance != null && GameManager.Instance.IsRaceStarted)
        {
            raceClock += Time.deltaTime;
        }
    }

    public void RegisterRacer(RacerIdentity racer)
    {
        if (racer == null)
        {
            return;
        }

        if (racers.Any(r => r.racer == racer))
        {
            return;
        }

        racers.Add(new RacerProgress
        {
            racer = racer,
            currentLap = 1,
            nextCheckpoint = 0,
            isFinished = false,
            finishTime = 0f
        });
    }

    public void TryPassCheckpoint(RacerIdentity racer, int checkpointIndex)
    {
        RacerProgress progress = racers.FirstOrDefault(r => r.racer == racer);
        if (progress == null || progress.isFinished || waypointCircuit == null || waypointCircuit.Count == 0)
        {
            return;
        }

        if (checkpointIndex != progress.nextCheckpoint)
        {
            return;
        }

        progress.nextCheckpoint++;

        if (progress.nextCheckpoint >= waypointCircuit.Count)
        {
            progress.nextCheckpoint = 0;
            progress.currentLap++;

            if (progress.currentLap > totalLaps)
            {
                progress.currentLap = totalLaps;
                progress.isFinished = true;
                progress.finishTime = raceClock;

                if (racer.IsPlayer && GameManager.Instance != null)
                {
                    GameManager.Instance.OnPlayerFinished(GetRacePosition(racer));
                }
            }
        }
    }

    public RacerProgress GetProgress(RacerIdentity racer)
    {
        return racers.FirstOrDefault(r => r.racer == racer);
    }

    public int GetRacePosition(RacerIdentity racer)
    {
        List<RacerProgress> ordered = GetOrderedRacers();
        int index = ordered.FindIndex(r => r.racer == racer);
        return index >= 0 ? index + 1 : ordered.Count;
    }

    public RacerIdentity GetRacerAhead(RacerIdentity racer)
    {
        List<RacerProgress> ordered = GetOrderedRacers();
        int index = ordered.FindIndex(r => r.racer == racer);
        if (index <= 0)
        {
            return null;
        }

        return ordered[index - 1].racer;
    }

    private List<RacerProgress> GetOrderedRacers()
    {
        return racers
            .OrderByDescending(r => r.isFinished)
            .ThenBy(r => r.isFinished ? r.finishTime : float.MaxValue)
            .ThenByDescending(r => r.currentLap)
            .ThenByDescending(r => r.nextCheckpoint)
            .ThenBy(r => GetDistanceToNextCheckpoint(r))
            .ToList();
    }

    private float GetDistanceToNextCheckpoint(RacerProgress progress)
    {
        if (waypointCircuit == null || waypointCircuit.Count == 0 || progress?.racer == null)
        {
            return float.MaxValue;
        }

        Transform next = waypointCircuit.GetWaypoint(progress.nextCheckpoint);
        if (next == null)
        {
            return float.MaxValue;
        }

        return Vector3.Distance(progress.racer.transform.position, next.position);
    }
}

[System.Serializable]
public class RacerProgress
{
    public RacerIdentity racer;
    public int currentLap;
    public int nextCheckpoint;
    public bool isFinished;
    public float finishTime;
}
