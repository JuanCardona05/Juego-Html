using System.Collections.Generic;
using UnityEngine;

public class WaypointCircuit : MonoBehaviour
{
    [SerializeField] private List<Transform> waypoints = new List<Transform>();
    [SerializeField] private bool drawGizmos = true;

    public int Count => waypoints.Count;

    public Transform GetWaypoint(int index)
    {
        if (waypoints.Count == 0)
        {
            return null;
        }

        int wrapped = (index % waypoints.Count + waypoints.Count) % waypoints.Count;
        return waypoints[wrapped];
    }

    private void OnDrawGizmos()
    {
        if (!drawGizmos || waypoints.Count < 2)
        {
            return;
        }

        Gizmos.color = new Color(0.1f, 1f, 0.8f, 0.9f);
        for (int i = 0; i < waypoints.Count; i++)
        {
            Transform current = waypoints[i];
            Transform next = waypoints[(i + 1) % waypoints.Count];
            if (current != null && next != null)
            {
                Gizmos.DrawLine(current.position, next.position);
                Gizmos.DrawSphere(current.position, 0.45f);
            }
        }
    }
}
