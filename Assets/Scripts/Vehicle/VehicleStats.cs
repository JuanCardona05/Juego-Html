using UnityEngine;

[System.Serializable]
public class VehicleStats
{
    [Header("Movement")]
    public float maxSpeed = 28f;
    public float acceleration = 20f;
    public float brakePower = 30f;
    public float reverseSpeedFactor = 0.45f;

    [Header("Handling")]
    public float handling = 95f;
    public float lateralGrip = 9f;
    public float driftGrip = 3.5f;

    [Header("Drift")]
    public float driftMinSpeed = 8f;
    public float driftChargeRate = 0.8f;
    public float driftBoostPower = 10f;

    [Header("Combat")]
    public float hitRecovery = 1.4f;
}
