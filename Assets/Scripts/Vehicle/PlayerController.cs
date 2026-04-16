using UnityEngine;

[RequireComponent(typeof(ArcadeKartController))]
[RequireComponent(typeof(PowerUpSystem))]
public class PlayerController : MonoBehaviour
{
    private ArcadeKartController kart;
    private PowerUpSystem powerUpSystem;

    private void Awake()
    {
        kart = GetComponent<ArcadeKartController>();
        powerUpSystem = GetComponent<PowerUpSystem>();
    }

    private void Update()
    {
        if (GameManager.Instance != null && !GameManager.Instance.IsRaceStarted)
        {
            kart.SetInput(0f, 0f, false);
            return;
        }

        float throttle = 0f;
        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow))
        {
            throttle += 1f;
        }
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow))
        {
            throttle -= 1f;
        }

        float steer = 0f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow))
        {
            steer += 1f;
        }
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow))
        {
            steer -= 1f;
        }

        bool drift = Input.GetKey(KeyCode.Space);
        kart.SetInput(throttle, steer, drift);

        if (Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.E))
        {
            powerUpSystem.UseCurrentPowerUp();
        }
    }
}
