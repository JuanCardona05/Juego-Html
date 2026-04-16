using UnityEngine;

[RequireComponent(typeof(Collider))]
public class CheckpointTrigger : MonoBehaviour
{
    [SerializeField] private int checkpointIndex;

    private void OnTriggerEnter(Collider other)
    {
        RacerIdentity racer = other.GetComponentInParent<RacerIdentity>();
        if (racer == null || LapSystem.Instance == null)
        {
            return;
        }

        LapSystem.Instance.TryPassCheckpoint(racer, checkpointIndex);
    }
}
