using UnityEngine;

public class SimpleSpin : MonoBehaviour
{
    [SerializeField] private Vector3 eulerPerSecond = new Vector3(0f, 80f, 0f);

    private void Update()
    {
        transform.Rotate(eulerPerSecond * Time.deltaTime, Space.Self);
    }
}
