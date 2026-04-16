using System;
using System.Collections;
using UnityEngine;

[RequireComponent(typeof(ArcadeKartController))]
[RequireComponent(typeof(RacerIdentity))]
public class PowerUpSystem : MonoBehaviour
{
    [SerializeField] private ProjectileMissile missilePrefab;
    [SerializeField] private Trap trapPrefab;
    [SerializeField] private Transform launchPoint;
    [SerializeField] private Transform trapDropPoint;
    [SerializeField] private GameObject shieldVisual;

    [Header("Values")]
    [SerializeField] private float turboDuration = 1.6f;
    [SerializeField] private float turboSpeedBonus = 12f;
    [SerializeField] private float shieldDuration = 3f;

    private ArcadeKartController kart;
    private RacerIdentity racer;

    private PowerUpType currentPowerUp = PowerUpType.None;
    private float shieldTimer;

    public event Action<PowerUpType> OnPowerUpChanged;

    public bool HasPowerUp => currentPowerUp != PowerUpType.None;
    public bool IsShieldActive => shieldTimer > 0f;
    public PowerUpType CurrentPowerUp => currentPowerUp;

    private void Awake()
    {
        kart = GetComponent<ArcadeKartController>();
        racer = GetComponent<RacerIdentity>();

        if (shieldVisual != null)
        {
            shieldVisual.SetActive(false);
        }
    }

    private void Update()
    {
        if (shieldTimer > 0f)
        {
            shieldTimer -= Time.deltaTime;
            if (shieldTimer <= 0f && shieldVisual != null)
            {
                shieldVisual.SetActive(false);
            }
        }
    }

    public void GrantRandomPowerUp()
    {
        PowerUpType[] choices =
        {
            PowerUpType.Turbo,
            PowerUpType.Missile,
            PowerUpType.Trap,
            PowerUpType.Shield
        };

        SetPowerUp(choices[UnityEngine.Random.Range(0, choices.Length)]);
    }

    public void UseCurrentPowerUp()
    {
        if (!HasPowerUp)
        {
            return;
        }

        switch (currentPowerUp)
        {
            case PowerUpType.Turbo:
                kart.ApplyExternalBoost(turboDuration, turboSpeedBonus + kart.Stats.driftBoostPower * 0.5f);
                ConsumePowerUp();
                break;

            case PowerUpType.Missile:
                LaunchMissile();
                break;

            case PowerUpType.Trap:
                DeployTrap();
                break;

            case PowerUpType.Shield:
                ActivateShield();
                ConsumePowerUp();
                break;
        }
    }

    public void ReceiveHit(float speedMultiplier, float duration)
    {
        if (IsShieldActive)
        {
            return;
        }

        kart.HitByAttack(speedMultiplier, duration);
    }

    private void LaunchMissile()
    {
        if (missilePrefab == null || LapSystem.Instance == null)
        {
            return;
        }

        RacerIdentity target = LapSystem.Instance.GetRacerAhead(racer);
        if (target == null)
        {
            return;
        }

        Transform spawn = launchPoint != null ? launchPoint : transform;
        ProjectileMissile missile = Instantiate(missilePrefab, spawn.position + transform.forward * 1.5f + Vector3.up * 0.6f, transform.rotation);
        missile.Initialize(racer, target);
        ConsumePowerUp();
    }

    private void DeployTrap()
    {
        if (trapPrefab == null)
        {
            return;
        }

        Transform drop = trapDropPoint != null ? trapDropPoint : transform;
        Instantiate(trapPrefab, drop.position - transform.forward * 1.4f + Vector3.up * 0.2f, Quaternion.identity).SetOwner(racer);
        ConsumePowerUp();
    }

    private void ActivateShield()
    {
        shieldTimer = Mathf.Max(shieldTimer, shieldDuration);
        if (shieldVisual != null)
        {
            shieldVisual.SetActive(true);
        }
    }

    private void SetPowerUp(PowerUpType powerUp)
    {
        currentPowerUp = powerUp;
        OnPowerUpChanged?.Invoke(currentPowerUp);
    }

    private void ConsumePowerUp()
    {
        SetPowerUp(PowerUpType.None);
    }
}
