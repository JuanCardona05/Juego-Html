using UnityEngine;

[RequireComponent(typeof(ArcadeKartController))]
[RequireComponent(typeof(PowerUpSystem))]
public class RacerIdentity : MonoBehaviour
{
    [SerializeField] private string racerName = "Racer";
    [SerializeField] private bool isPlayer;

    public string RacerName => racerName;
    public bool IsPlayer => isPlayer;

    public ArcadeKartController KartController { get; private set; }
    public PowerUpSystem PowerUpSystem { get; private set; }

    private void Awake()
    {
        KartController = GetComponent<ArcadeKartController>();
        PowerUpSystem = GetComponent<PowerUpSystem>();
    }
}
