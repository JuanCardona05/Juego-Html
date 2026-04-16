using UnityEngine;

[RequireComponent(typeof(ArcadeKartController))]
[RequireComponent(typeof(PowerUpSystem))]
public class AIController : MonoBehaviour
{
    [SerializeField] private WaypointCircuit circuit;
    [SerializeField] private float waypointReachDistance = 7f;
    [SerializeField] private float lookAheadFactor = 0.35f;
    [SerializeField] private float cautiousSteerThreshold = 0.6f;
    [SerializeField] private Vector2 powerUpUseInterval = new Vector2(2f, 5f);
    [SerializeField] private float powerUpUseChance = 0.7f;

    private ArcadeKartController kart;
    private PowerUpSystem powerUpSystem;
    private Rigidbody rb;

    private int currentWaypointIndex;
    private float nextPowerUpUseTimer;

    private void Awake()
    {
        kart = GetComponent<ArcadeKartController>();
        powerUpSystem = GetComponent<PowerUpSystem>();
        rb = GetComponent<Rigidbody>();
    }

    private void Start()
    {
        ScheduleNextPowerUpUse();

        if (circuit == null && LapSystem.Instance != null)
        {
            circuit = LapSystem.Instance.Circuit;
        }
    }

    private void Update()
    {
        if (GameManager.Instance != null && !GameManager.Instance.IsRaceStarted)
        {
            kart.SetInput(0f, 0f, false);
            return;
        }

        if (circuit == null || circuit.Count == 0)
        {
            kart.SetInput(0f, 0f, false);
            return;
        }

        Transform targetWaypoint = circuit.GetWaypoint(currentWaypointIndex);
        if (targetWaypoint == null)
        {
            kart.SetInput(0f, 0f, false);
            return;
        }

        float distanceToWaypoint = Vector3.Distance(transform.position, targetWaypoint.position);
        if (distanceToWaypoint < waypointReachDistance)
        {
            currentWaypointIndex = (currentWaypointIndex + 1) % circuit.Count;
            targetWaypoint = circuit.GetWaypoint(currentWaypointIndex);
        }

        Vector3 targetPosition = targetWaypoint.position + targetWaypoint.forward * lookAheadFactor;
        Vector3 localTarget = transform.InverseTransformPoint(targetPosition);

        float steer = Mathf.Clamp(localTarget.x / Mathf.Max(1f, localTarget.magnitude), -1f, 1f);
        float throttle = Mathf.Abs(steer) > cautiousSteerThreshold ? 0.72f : 1f;

        float forwardSpeed = 0f;
        if (rb != null)
        {
            forwardSpeed = Mathf.Abs(transform.InverseTransformDirection(rb.velocity).z);
        }

        bool drift = Mathf.Abs(steer) > 0.52f && forwardSpeed > kart.Stats.driftMinSpeed;

        kart.SetInput(throttle, steer, drift);

        HandlePowerUpUsage();
    }

    private void HandlePowerUpUsage()
    {
        if (!powerUpSystem.HasPowerUp)
        {
            return;
        }

        nextPowerUpUseTimer -= Time.deltaTime;
        if (nextPowerUpUseTimer > 0f)
        {
            return;
        }

        if (Random.value <= powerUpUseChance)
        {
            powerUpSystem.UseCurrentPowerUp();
        }

        ScheduleNextPowerUpUse();
    }

    private void ScheduleNextPowerUpUse()
    {
        nextPowerUpUseTimer = Random.Range(powerUpUseInterval.x, powerUpUseInterval.y);
    }
}
