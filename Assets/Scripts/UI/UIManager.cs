using UnityEngine;
using UnityEngine.UI;

public class UIManager : MonoBehaviour
{
    [Header("HUD")]
    [SerializeField] private Text positionText;
    [SerializeField] private Text lapText;
    [SerializeField] private Text powerUpText;
    [SerializeField] private Text startHintText;

    [Header("References")]
    [SerializeField] private RacerIdentity player;

    private PowerUpSystem playerPowerUpSystem;

    private void Start()
    {
        if (player == null)
        {
            RacerIdentity[] racers = FindObjectsOfType<RacerIdentity>();
            foreach (RacerIdentity racer in racers)
            {
                if (racer.IsPlayer)
                {
                    player = racer;
                    break;
                }
            }
        }

        if (player != null)
        {
            playerPowerUpSystem = player.PowerUpSystem;
            if (playerPowerUpSystem != null)
            {
                playerPowerUpSystem.OnPowerUpChanged += OnPowerUpChanged;
                OnPowerUpChanged(playerPowerUpSystem.CurrentPowerUp);
            }
        }
    }

    private void Update()
    {
        if (player == null || LapSystem.Instance == null)
        {
            return;
        }

        int position = LapSystem.Instance.GetRacePosition(player);
        RacerProgress progress = LapSystem.Instance.GetProgress(player);

        if (positionText != null)
        {
            positionText.text = "Posicion: " + position;
        }

        if (lapText != null && progress != null)
        {
            string lapValue = progress.isFinished ? "Meta" : progress.currentLap + "/" + LapSystem.Instance.TotalLaps;
            lapText.text = "Vuelta: " + lapValue;
        }

        if (startHintText != null && GameManager.Instance != null)
        {
            startHintText.enabled = !GameManager.Instance.IsRaceStarted;
            startHintText.text = "ESPACIO/ENTER para iniciar - R para reiniciar";
        }
    }

    private void OnDestroy()
    {
        if (playerPowerUpSystem != null)
        {
            playerPowerUpSystem.OnPowerUpChanged -= OnPowerUpChanged;
        }
    }

    private void OnPowerUpChanged(PowerUpType type)
    {
        if (powerUpText == null)
        {
            return;
        }

        powerUpText.text = "Power-up: " + TranslatePowerUp(type);
    }

    private string TranslatePowerUp(PowerUpType type)
    {
        switch (type)
        {
            case PowerUpType.Turbo:
                return "Turbo";
            case PowerUpType.Missile:
                return "Misil";
            case PowerUpType.Trap:
                return "Trampa";
            case PowerUpType.Shield:
                return "Escudo";
            default:
                return "Ninguno";
        }
    }
}
