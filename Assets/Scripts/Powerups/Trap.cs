using UnityEngine;

[RequireComponent(typeof(Collider))]
public class Trap : MonoBehaviour
{
    [SerializeField] private float lifetime = 10f;
    [SerializeField] private float speedMultiplier = 0.55f;
    [SerializeField] private float hitDuration = 1.5f;

    private RacerIdentity owner;

    public Trap SetOwner(RacerIdentity trapOwner)
    {
        owner = trapOwner;
        return this;
    }

    private void Update()
    {
        lifetime -= Time.deltaTime;
        if (lifetime <= 0f)
        {
            Destroy(gameObject);
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        RacerIdentity hit = other.GetComponentInParent<RacerIdentity>();
        if (hit == null || hit == owner)
        {
            return;
        }

        PowerUpSystem system = hit.GetComponent<PowerUpSystem>();
        if (system != null)
        {
            system.ReceiveHit(speedMultiplier, hitDuration);
        }

        Destroy(gameObject);
    }
}
