using UnityEngine;

[RequireComponent(typeof(Collider))]
public class ProjectileMissile : MonoBehaviour
{
    [SerializeField] private float speed = 30f;
    [SerializeField] private float turnRate = 7f;
    [SerializeField] private float lifetime = 7f;

    private RacerIdentity owner;
    private RacerIdentity target;

    public void Initialize(RacerIdentity ownerRacer, RacerIdentity targetRacer)
    {
        owner = ownerRacer;
        target = targetRacer;
    }

    private void Update()
    {
        lifetime -= Time.deltaTime;
        if (lifetime <= 0f)
        {
            Destroy(gameObject);
            return;
        }

        if (target == null)
        {
            transform.position += transform.forward * speed * Time.deltaTime;
            return;
        }

        Vector3 targetPos = target.transform.position + Vector3.up * 0.8f;
        Vector3 desiredDirection = (targetPos - transform.position).normalized;
        Quaternion desiredRotation = Quaternion.LookRotation(desiredDirection, Vector3.up);
        transform.rotation = Quaternion.Slerp(transform.rotation, desiredRotation, turnRate * Time.deltaTime);

        transform.position += transform.forward * speed * Time.deltaTime;
    }

    private void OnTriggerEnter(Collider other)
    {
        RacerIdentity hitRacer = other.GetComponentInParent<RacerIdentity>();
        if (hitRacer != null)
        {
            if (hitRacer == owner)
            {
                return;
            }

            PowerUpSystem system = hitRacer.GetComponent<PowerUpSystem>();
            if (system != null)
            {
                system.ReceiveHit(0.5f, 1.2f);
            }

            Destroy(gameObject);
            return;
        }

        if (!other.isTrigger)
        {
            Destroy(gameObject);
        }
    }
}
