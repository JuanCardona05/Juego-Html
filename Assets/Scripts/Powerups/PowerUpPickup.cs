using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Collider))]
public class PowerUpPickup : MonoBehaviour
{
    [SerializeField] private float respawnTime = 6f;
    [SerializeField] private MeshRenderer visual;
    [SerializeField] private Collider triggerCollider;

    private void Reset()
    {
        triggerCollider = GetComponent<Collider>();
        visual = GetComponentInChildren<MeshRenderer>();
        if (triggerCollider != null)
        {
            triggerCollider.isTrigger = true;
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        PowerUpSystem system = other.GetComponentInParent<PowerUpSystem>();
        if (system == null || system.HasPowerUp)
        {
            return;
        }

        system.GrantRandomPowerUp();
        StartCoroutine(RespawnRoutine());
    }

    private IEnumerator RespawnRoutine()
    {
        if (visual != null)
        {
            visual.enabled = false;
        }

        if (triggerCollider != null)
        {
            triggerCollider.enabled = false;
        }

        yield return new WaitForSeconds(respawnTime);

        if (visual != null)
        {
            visual.enabled = true;
        }

        if (triggerCollider != null)
        {
            triggerCollider.enabled = true;
        }
    }
}
