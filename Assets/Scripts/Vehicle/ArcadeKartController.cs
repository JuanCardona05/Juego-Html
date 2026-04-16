using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class ArcadeKartController : MonoBehaviour
{
    [SerializeField] private VehicleStats stats = new VehicleStats();
    [SerializeField] private ParticleSystem driftParticles;
    [SerializeField] private ParticleSystem boostParticles;
    [SerializeField] private ParticleSystem collisionParticles;

    private Rigidbody rb;

    private float throttleInput;
    private float steerInput;
    private bool driftInput;

    private float externalBoost;
    private float boostTimer;
    private float driftCharge;
    private bool wasDrifting;

    private float speedPenaltyMultiplier = 1f;
    private Coroutine hitRoutine;

    public VehicleStats Stats => stats;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        rb.centerOfMass = new Vector3(0f, -0.35f, 0f);
        rb.interpolation = RigidbodyInterpolation.Interpolate;
    }

    public void SetInput(float throttle, float steer, bool drift)
    {
        throttleInput = Mathf.Clamp(throttle, -1f, 1f);
        steerInput = Mathf.Clamp(steer, -1f, 1f);
        driftInput = drift;
    }

    public void ApplyExternalBoost(float duration, float speedBonus)
    {
        boostTimer = Mathf.Max(boostTimer, duration);
        externalBoost = Mathf.Max(externalBoost, speedBonus);

        if (boostParticles != null && !boostParticles.isPlaying)
        {
            boostParticles.Play();
        }
    }

    public void HitByAttack(float speedMultiplier, float duration)
    {
        if (hitRoutine != null)
        {
            StopCoroutine(hitRoutine);
        }

        hitRoutine = StartCoroutine(HitRoutine(speedMultiplier, duration));
    }

    private IEnumerator HitRoutine(float speedMultiplier, float duration)
    {
        speedPenaltyMultiplier = Mathf.Clamp(speedMultiplier, 0.2f, 1f);
        yield return new WaitForSeconds(duration);
        speedPenaltyMultiplier = 1f;
        hitRoutine = null;
    }

    private void FixedUpdate()
    {
        if (GameManager.Instance != null && !GameManager.Instance.IsRaceStarted)
        {
            rb.velocity = Vector3.Lerp(rb.velocity, Vector3.zero, 0.08f);
            UpdateParticles(false, false);
            return;
        }

        float dt = Time.fixedDeltaTime;
        Vector3 localVelocity = transform.InverseTransformDirection(rb.velocity);

        float currentForwardSpeed = localVelocity.z;
        float maxForwardSpeed = (stats.maxSpeed + externalBoost) * speedPenaltyMultiplier;
        float maxReverseSpeed = stats.maxSpeed * stats.reverseSpeedFactor;

        float targetForwardSpeed = 0f;
        if (throttleInput > 0f)
        {
            targetForwardSpeed = throttleInput * maxForwardSpeed;
        }
        else if (throttleInput < 0f)
        {
            targetForwardSpeed = throttleInput * maxReverseSpeed;
        }

        float accelRate = throttleInput >= 0f ? stats.acceleration : stats.brakePower;
        currentForwardSpeed = Mathf.MoveTowards(currentForwardSpeed, targetForwardSpeed, accelRate * dt);

        bool canDrift = driftInput && Mathf.Abs(steerInput) > 0.2f && Mathf.Abs(currentForwardSpeed) > stats.driftMinSpeed;

        float lateralTarget = 0f;
        float grip = canDrift ? stats.driftGrip : stats.lateralGrip;
        float lateralSpeed = Mathf.MoveTowards(localVelocity.x, lateralTarget, grip * dt);

        if (canDrift)
        {
            driftCharge += Mathf.Abs(steerInput) * stats.driftChargeRate * dt;
        }

        if (wasDrifting && !canDrift)
        {
            if (driftCharge > 0.3f)
            {
                float driftBoostDuration = Mathf.Clamp(driftCharge, 0.35f, 1.35f);
                ApplyExternalBoost(driftBoostDuration, stats.driftBoostPower);
            }

            driftCharge = 0f;
        }

        wasDrifting = canDrift;

        if (boostTimer > 0f)
        {
            boostTimer -= dt;
        }
        else
        {
            externalBoost = Mathf.MoveTowards(externalBoost, 0f, 12f * dt);
        }

        localVelocity = new Vector3(lateralSpeed, localVelocity.y, currentForwardSpeed);
        rb.velocity = transform.TransformDirection(localVelocity);

        float speedRatio = Mathf.Clamp01(Mathf.Abs(currentForwardSpeed) / Mathf.Max(1f, stats.maxSpeed));
        float steeringPower = stats.handling * speedRatio;
        if (canDrift)
        {
            steeringPower *= 1.15f;
        }

        float yaw = steerInput * steeringPower * dt;
        rb.MoveRotation(rb.rotation * Quaternion.Euler(0f, yaw, 0f));

        UpdateParticles(canDrift, boostTimer > 0f);
    }

    private void UpdateParticles(bool drifting, bool boosting)
    {
        if (driftParticles != null)
        {
            if (drifting && !driftParticles.isPlaying)
            {
                driftParticles.Play();
            }
            else if (!drifting && driftParticles.isPlaying)
            {
                driftParticles.Stop();
            }
        }

        if (boostParticles != null)
        {
            if (boosting && !boostParticles.isPlaying)
            {
                boostParticles.Play();
            }
            else if (!boosting && boostParticles.isPlaying)
            {
                boostParticles.Stop();
            }
        }
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.relativeVelocity.magnitude < 2f)
        {
            return;
        }

        Vector3 normal = collision.contacts[0].normal;
        Vector3 bounce = Vector3.Reflect(rb.velocity, normal);
        rb.velocity = Vector3.Lerp(rb.velocity, bounce, 0.25f) * 0.72f;

        if (collisionParticles != null)
        {
            collisionParticles.Play();
        }
    }
}
