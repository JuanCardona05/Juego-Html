using UnityEngine;

public class ThirdPersonCamera : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 localOffset = new Vector3(0f, 4.5f, -7f);
    [SerializeField] private float followSpeed = 8f;
    [SerializeField] private float lookSpeed = 10f;
    [SerializeField] private float lookAhead = 2f;

    private void LateUpdate()
    {
        if (target == null)
        {
            return;
        }

        Vector3 desiredPosition = target.TransformPoint(localOffset) + target.forward * lookAhead;
        transform.position = Vector3.Lerp(transform.position, desiredPosition, followSpeed * Time.deltaTime);

        Vector3 lookTarget = target.position + Vector3.up * 1.2f + target.forward * 2f;
        Quaternion desiredRotation = Quaternion.LookRotation(lookTarget - transform.position, Vector3.up);
        transform.rotation = Quaternion.Slerp(transform.rotation, desiredRotation, lookSpeed * Time.deltaTime);
    }
}
